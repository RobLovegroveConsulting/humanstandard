// Live calls are only made by the explicitly enabled worker. No tokens in logs/errors.
export class MetaError extends Error {
  constructor(code, ambiguous = false) {
    super(code);
    this.code = code;
    this.ambiguous = ambiguous;
  }
}
export function createMeta({ version, token, fetchImpl = fetch }) {
  if (!/^v\d+\.\d+$/.test(version || "") || !token)
    throw Error("Meta server credentials/version are not configured.");
  async function call(id, edge, params = {}, method = "GET") {
    if (!/^\d+$/.test(id)) throw Error("Invalid Meta object ID.");
    const url = new URL(
      `https://graph.facebook.com/${version}/${id}${edge ? "/" + edge : ""}`,
    );
    const options = {
      method,
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    };
    if (method === "GET") {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    } else options.body = new URLSearchParams(params);
    let response, body;
    try {
      response = await fetchImpl(url, options);
      body = await response.json();
    } catch {
      throw new MetaError("META_OUTCOME_UNKNOWN", true);
    }
    if (!response.ok || body.error)
      throw new MetaError(
        response.status >= 500
          ? "META_OUTCOME_UNKNOWN"
          : body.error?.code === 190
            ? "META_ACCESS_EXPIRED"
            : response.status === 429
              ? "META_RATE_LIMITED"
              : "META_REJECTED",
        response.status >= 500,
      );
    return body;
  }
  const idOf = (body) => {
    if (!/^\d+(?:_\d+)?$/.test(body.id || ""))
      throw new MetaError("META_OUTCOME_UNKNOWN", true);
    return body.id;
  };
  return {
    async verify(connection) {
      const page = await call(connection.pageId, "", { fields: "id,name" });
      if (page.id !== connection.pageId)
        throw Error("Meta Page identity mismatch.");
      if (connection.instagramId) {
        const pageIG = await call(connection.pageId, "", {
          fields: "instagram_business_account",
        });
        if (pageIG.instagram_business_account?.id !== connection.instagramId)
          throw Error(
            "Instagram account is not linked to the configured Page.",
          );
      }
      return { pageId: page.id, name: page.name };
    },
    async createContainer(connection, post, imageUrl) {
      return idOf(
        await call(
          connection.instagramId,
          "media",
          { image_url: imageUrl, caption: post.text },
          "POST",
        ),
      );
    },
    async containerStatus(containerId) {
      return (await call(containerId, "", { fields: "status_code" }))
        .status_code;
    },
    async publish(connection, post, imageUrl, containerId) {
      if (post.platform === "instagram")
        return idOf(
          await call(
            connection.instagramId,
            "media_publish",
            { creation_id: containerId },
            "POST",
          ),
        );
      const body = await call(
        connection.pageId,
        imageUrl ? "photos" : "feed",
        imageUrl
          ? { url: imageUrl, caption: post.text, published: "true" }
          : { message: post.text },
        "POST",
      );
      // Photo APIs may return post_id as well as the photo ID.
      return idOf({ id: body.post_id || body.id });
    },
  };
}

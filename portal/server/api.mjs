import {
  root,
  PILOT_CLIENT,
  requirePilot,
  assertConnection,
  PilotError,
} from "./policy.mjs";
const reply = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export function createApi({ auth, db, store, enabled }) {
  return async (request) => {
    if (!["GET", "POST"].includes(request.method))
      return reply(405, { error: "Method not allowed." });
    const token = request.headers
      .get("Authorization")
      ?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) return reply(401, { error: "Sign in to continue." });
    let user;
    try {
      user = await auth.verifyIdToken(token, true);
    } catch {
      return reply(401, { error: "Your session needs renewal." });
    }
    if (!user.email_verified)
      return reply(403, { error: "Verify your email first." });
    const member = (await db.doc(`${root}/members/${user.uid}`).get()).data();
    if (!member?.active || !["admin", "editor"].includes(member.role))
      return reply(403, { error: "Workspace editor access required." });
    if (request.method === "GET") {
      const jobs = await store.list(PILOT_CLIENT);
      const c = await store.connection();
      const channels = ["facebook", "instagram"].filter((platform) => {
        try {
          assertConnection(c, platform);
          return true;
        } catch {
          return false;
        }
      });
      const ready = enabled && channels.length > 0;
      return reply(200, {
        clientId: PILOT_CLIENT,
        enabled: ready,
        jobs,
        channels: ready ? channels : [],
        timeZone: "Australia/Brisbane",
      });
    }
    let data;
    try {
      const text = await request.text();
      if (text.length > 8000) throw Error();
      data = JSON.parse(text);
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw Error();
    } catch {
      return reply(400, { error: "Invalid scheduling request." });
    }
    try {
      requirePilot(data.clientId);
      if (data.action === "cancel") {
        if (
          typeof data.jobId !== "string" ||
          !/^esk-cheap-shop_[\w-]{1,128}$/.test(data.jobId)
        )
          return reply(400, { error: "Invalid schedule ID." });
        await store.cancel(data.jobId, user.uid);
        return reply(200, { cancelled: true });
      }
      if (!enabled)
        return reply(409, {
          error:
            "Pilot publishing is not activated. Meta connection and staging tests must be completed first.",
        });
      if (data.action !== "schedule")
        return reply(400, { error: "Invalid action." });
      const id = await store.schedule({
        clientId: data.clientId,
        postId: data.postId,
        actor: user.uid,
        publishAt: data.publishAt,
      });
      return reply(200, { id });
    } catch (error) {
      return reply(409, {
        error:
          error instanceof PilotError
            ? error.message
            : "Scheduling could not be completed. Try again or ask the workspace administrator to check the connection.",
      });
    }
  };
}

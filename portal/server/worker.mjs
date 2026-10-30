import { Timestamp } from "firebase-admin/firestore";
export async function runWorker({
  enabled,
  store,
  meta,
  mediaUrl,
  now = () => Date.now(),
}) {
  if (!enabled) return { disabled: true, processed: 0 };
  await store.recover(now());
  let processed = 0;
  for (const id of await store.due(now())) {
    const job = await store.claim(id, now());
    if (!job) continue;
    try {
      const { post, connection } = await store.context(job, now());
      const asset = await store.asset(job, post);
      if (post.platform === "instagram" && !asset)
        throw Error("Instagram requires a JPEG image.");
      if (post.platform === "instagram" && !job.containerId) {
        const containerId = await meta.createContainer(
          connection,
          post,
          await mediaUrl(asset),
        );
        await store.finish(
          job,
          {
            status: "queued",
            phase: "poll",
            containerId,
            dueAt: Timestamp.fromMillis(now() + 60000),
          },
          now(),
        );
      } else {
        if (post.platform === "instagram") {
          const status = await meta.containerStatus(job.containerId);
          if (status === "IN_PROGRESS") {
            await store.finish(
              job,
              { status: "queued", dueAt: Timestamp.fromMillis(now() + 60000) },
              now(),
            );
            processed++;
            continue;
          }
          if (status !== "FINISHED")
            throw Error("Instagram media processing requires attention.");
        }
        // Rechecks cancellation, approval, actor access and connection inside a transaction.
        await store.markSending(job, now());
        const imageUrl =
          post.platform === "facebook" && asset ? await mediaUrl(asset) : null;
        const providerId = await meta.publish(
          connection,
          post,
          imageUrl,
          job.containerId,
        );
        await store.finish(
          job,
          {
            status: "published",
            providerId,
            publishedAt: Timestamp.fromMillis(now()),
          },
          now(),
        );
      }
    } catch (error) {
      // No automatic resend after an uncertain provider outcome; an operator must reconcile.
      const code = error?.code?.startsWith("META_")
        ? error.code
        : "VALIDATION_OR_ACCESS_FAILED";
      await store.finish(
        job,
        { status: "needs_attention", error: code },
        now(),
      );
    }
    processed++;
  }
  return { disabled: false, processed };
}

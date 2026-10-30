// Read-only. Provide credentials in the shell's secure environment, never in chat or arguments.
import { createMeta } from "../server/meta.mjs";
const meta = createMeta({
  version: process.env.META_GRAPH_VERSION,
  token: process.env.ESK_META_PAGE_TOKEN,
});
try {
  const identity = await meta.verify({
    pageId: process.env.ESK_META_PAGE_ID,
    instagramId: process.env.ESK_META_INSTAGRAM_ID || null,
  });
  console.log(
    JSON.stringify(
      {
        identity,
        publishingVerified: false,
        note: "Read-only identity verification passed. Publishing permission and a specifically approved staging post still require validation.",
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error.code || "META_IDENTITY_CHECK_FAILED");
  process.exitCode = 1;
}

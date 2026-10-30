import { getStorage } from "firebase-admin/storage";
import { services } from "../firebase.mjs";
import { createStore } from "../store.mjs";
import { createMeta } from "../meta.mjs";
import { runWorker } from "../worker.mjs";
export const config = { schedule: "* * * * *" };
export default async () => {
  // Fail closed before initializing Firebase or constructing a live API adapter.
  if (process.env.ESK_PUBLISHING_ENABLED !== "true")
    return new Response(null, { status: 204 });
  const { db, app } = services();
  const meta = createMeta({
    version: process.env.META_GRAPH_VERSION,
    token: process.env.ESK_META_PAGE_TOKEN,
  });
  const result = await runWorker({
    enabled: true,
    store: createStore(db),
    meta,
    mediaUrl: async (asset) => {
      const [url] = await getStorage(app)
        .bucket()
        .file(asset.objectPath)
        .getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + 3600000,
        });
      return url;
    },
  });
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
};

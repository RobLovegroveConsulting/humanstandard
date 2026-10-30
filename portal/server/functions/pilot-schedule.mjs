import { services } from "../firebase.mjs";
import { createStore } from "../store.mjs";
import { createApi } from "../api.mjs";
export default async (request) => {
  try {
    const { db, auth } = services();
    return await createApi({
      db,
      auth,
      store: createStore(db),
      enabled:
        process.env.ESK_PUBLISHING_ENABLED === "true" &&
        Boolean(process.env.ESK_META_PAGE_TOKEN) &&
        /^v\d+\.\d+$/.test(process.env.META_GRAPH_VERSION || ""),
    })(request);
  } catch {
    return new Response(
      JSON.stringify({
        error:
          "Scheduling service is not configured or is temporarily unavailable.",
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }
};

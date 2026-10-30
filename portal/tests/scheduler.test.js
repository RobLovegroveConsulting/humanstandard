import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PILOT_CLIENT,
  requirePilot,
  validateSchedule,
  revision,
  canExecute,
} from "../server/policy.mjs";
import { runWorker } from "../server/worker.mjs";
import { createMeta } from "../server/meta.mjs";
import { createApi } from "../server/api.mjs";
const now = Date.UTC(2026, 9, 31, 0, 0);
const approved = {
  text: "Esk pilot",
  platform: "facebook",
  status: "approved",
  updatedAt: { toMillis: () => now },
  updatedBy: "rob",
};
const connection = {
  clientId: PILOT_CLIENT,
  pageId: "123",
  active: true,
  publishingVerified: true,
  channels: ["facebook", "instagram"],
  validUntil: { toMillis: () => now + 86400000 },
  instagramId: "456",
};
test("only pilot client, approved content and future times accepted", () => {
  assert.throws(() => requirePilot("cumquats-australia"));
  assert.throws(() =>
    validateSchedule({ ...approved, status: "draft" }, now + 300000, now),
  );
  assert.throws(() =>
    validateSchedule({ ...approved, platform: "instagram" }, now + 300000, now),
  );
  assert.throws(() => validateSchedule(approved, now - 1, now));
  assert.equal(
    validateSchedule(approved, now + 300000, now).getTime(),
    now + 300000,
  );
});
test("reapproval changes the revision even when copy is identical", () => {
  assert.notEqual(
    revision(approved),
    revision({ ...approved, updatedAt: { toMillis: () => now + 1 } }),
  );
});
test("worker rejects revocation, wrong mapping, changed approval and overdue jobs", () => {
  const job = {
    clientId: PILOT_CLIENT,
    pageId: "123",
    revision: revision(approved),
    publishAt: { toMillis: () => now },
  };
  canExecute(job, approved, { active: true, role: "editor" }, connection, now);
  for (const [post, member, c, time] of [
    [approved, { active: false }, connection, now],
    [
      { ...approved, text: "changed" },
      { active: true, role: "admin" },
      connection,
      now,
    ],
    [
      approved,
      { active: true, role: "admin" },
      { ...connection, pageId: "999" },
      now,
    ],
    [approved, { active: true, role: "admin" }, connection, now + 16 * 60000],
  ])
    assert.throws(() => canExecute(job, post, member, c, time));
});
function harness({ cancel = false, unknown = false, instagram = false } = {}) {
  const result = [];
  let sent = 0;
  const job = {
    id: "job",
    clientId: PILOT_CLIENT,
    phase: "prepare",
    ...(instagram ? { containerId: "789" } : {}),
  };
  return {
    result,
    get sent() {
      return sent;
    },
    args: {
      enabled: true,
      now: () => now,
      mediaUrl: async () => "https://signed.example/image",
      store: {
        recover: async () => {},
        due: async () => ["job"],
        claim: async () => job,
        context: async () => ({
          post: instagram
            ? { ...approved, platform: "instagram", assetId: "photo" }
            : approved,
          connection,
        }),
        asset: async () => (instagram ? {} : null),
        markSending: async () => {
          if (cancel) throw Error("Cancelled");
        },
        finish: async (_, patch) => {
          result.push(patch);
        },
      },
      meta: {
        containerStatus: async () => "FINISHED",
        publish: async () => {
          sent++;
          if (unknown) throw { code: "META_OUTCOME_UNKNOWN" };
          return "123_999";
        },
      },
    },
  };
}
test("disabled worker performs no reads or calls", async () => {
  assert.deepEqual(await runWorker({ enabled: false }), {
    disabled: true,
    processed: 0,
  });
});
test("cancel race stops publication", async () => {
  const h = harness({ cancel: true });
  await runWorker(h.args);
  assert.equal(h.sent, 0);
});
test("successful server execution records provider confirmation", async () => {
  const h = harness();
  await runWorker(h.args);
  assert.equal(h.sent, 1);
  assert.equal(h.result[0].providerId, "123_999");
  assert.equal(h.result[0].status, "published");
});
test("ambiguous outcome requires attention and is never blindly retried", async () => {
  const h = harness({ unknown: true });
  await runWorker(h.args);
  assert.equal(h.sent, 1);
  assert.equal(h.result[0].status, "needs_attention");
  assert.equal(h.result[0].error, "META_OUTCOME_UNKNOWN");
});
test("Instagram waits for processing, without publishing early", async () => {
  const h = harness({ instagram: true });
  h.args.meta.containerStatus = async () => "IN_PROGRESS";
  await runWorker(h.args);
  assert.equal(h.sent, 0);
  assert.equal(h.result[0].status, "queued");
});
test("adapter uses auth header and redacts provider/network errors", async () => {
  let request;
  const meta = createMeta({
    version: "v26.0",
    token: "TEST_SECRET",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(
        JSON.stringify({
          error: { message: "contains TEST_SECRET", code: 190 },
        }),
        { status: 400 },
      );
    },
  });
  await assert.rejects(
    () => meta.publish(connection, approved),
    (e) =>
      e.message === "META_ACCESS_EXPIRED" && !e.message.includes("TEST_SECRET"),
  );
  assert.equal(request.options.headers.Authorization, "Bearer TEST_SECRET");
  assert.equal(request.url.searchParams.has("access_token"), false);
});
test("HTTP endpoint denies anonymous and non-member calls", async () => {
  const api = createApi({
    auth: {
      verifyIdToken: async () => ({ uid: "outsider", email_verified: true }),
    },
    db: { doc: () => ({ get: async () => ({ data: () => null }) }) },
  });
  assert.equal((await api(new Request("https://example.com"))).status, 401);
  assert.equal(
    (
      await api(
        new Request("https://example.com", {
          headers: { Authorization: "Bearer test" },
        }),
      )
    ).status,
    403,
  );
});

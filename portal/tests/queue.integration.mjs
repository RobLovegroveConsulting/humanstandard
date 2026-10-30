import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createStore } from "../server/store.mjs";
import { root, PILOT_CLIENT } from "../server/policy.mjs";
const app = initializeApp({ projectId: "demo-human-standard" }, "queue-tests");
const db = getFirestore(app);
const store = createStore(db);
const now = Date.now();
const postRef = db.doc(`${root}/clients/${PILOT_CLIENT}/posts/post`);
try {
  await db.doc(`${root}/members/rob`).set({ active: true, role: "admin" });
  await db
    .doc(`${root}/integrations/meta-esk`)
    .set({
      clientId: PILOT_CLIENT,
      pageId: "123",
      active: true,
      publishingVerified: true,
      channels: ["facebook"],
      validUntil: Timestamp.fromMillis(now + 86400000),
    });
  await postRef.set({
    text: "Pilot test",
    platform: "facebook",
    status: "approved",
    updatedAt: Timestamp.fromMillis(now),
    updatedBy: "rob",
  });
  const args = {
    clientId: PILOT_CLIENT,
    postId: "post",
    actor: "rob",
    publishAt: new Date(now + 300000).toISOString(),
  };
  const [a, b] = await Promise.all([
    store.schedule(args, now),
    store.schedule(args, now),
  ]);
  assert.equal(a, b);
  assert.equal((await db.collection(`${root}/publishJobs`).get()).size, 1);
  assert.deepEqual(await store.due(now), []);
  const claims = await Promise.all([
    store.claim(a, now + 300001),
    store.claim(a, now + 300001),
  ]);
  const job = claims.find(Boolean);
  assert.equal(claims.filter(Boolean).length, 1);
  await store.context(job, now + 300001);
  await store.cancel(a, "rob", now + 300002);
  await assert.rejects(() => store.markSending(job, now + 300003));
  await store.schedule(args, now);
  const newJob = await store.claim(a, now + 300001);
  await store.markSending(newJob, now + 300002);
  await assert.rejects(() => store.cancel(a, "rob", now + 300003));
  // A terminated or ambiguous sender is not automatically reclaimed or published again.
  await store.recover(now + 500000);
  assert.equal(
    (await db.doc(`${root}/publishJobs/${a}`).get()).data().status,
    "needs_attention",
  );
  assert.equal(await store.claim(a, now + 500001), null);
  await assert.rejects(() => store.schedule(args, now));
  await assert.rejects(() =>
    store.schedule({ ...args, clientId: "cumquats-australia" }, now),
  );
  await assert.rejects(() =>
    store.schedule({ ...args, actor: "outsider", postId: "other" }, now),
  );
  // Browser writes cannot create jobs or activate credentials under default-deny rules (covered separately in access.rules.js).
  console.log(
    "PASS: durable queue, schedule deduplication, concurrent claim exclusion, cancel/send race, interrupted-worker quarantine and pilot/operator restrictions.",
  );
} finally {
  await db.recursiveDelete(db.doc(root));
  await deleteApp(app);
}

import { Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import {
  root,
  PilotError,
  requirePilot,
  revision,
  validateSchedule,
  assertConnection,
  canExecute,
} from "./policy.mjs";
export function createStore(db) {
  const jobs = db.collection(`${root}/publishJobs`);
  const postRef = (c, p) => db.doc(`${root}/clients/${c}/posts/${p}`);
  const connectionRef = db.doc(`${root}/integrations/meta-esk`);
  function log(tx, job, action, now) {
    tx.set(db.collection(`${root}/activity`).doc(), {
      actor: job.actor,
      clientId: job.clientId,
      targetId: job.postId,
      action,
      createdAt: Timestamp.fromMillis(now),
    });
  }
  async function load(tx, job) {
    const [p, m, c] = await Promise.all([
      tx.get(postRef(job.clientId, job.postId)),
      tx.get(db.doc(`${root}/members/${job.actor}`)),
      tx.get(connectionRef),
    ]);
    return { post: p.data(), member: m.data(), connection: c.data() };
  }
  return {
    async connection() {
      return (await connectionRef.get()).data();
    },
    async list(clientId) {
      requirePilot(clientId);
      const snap = await jobs
        .where("clientId", "==", clientId)
        .limit(100)
        .get();
      return snap.docs
        .map((d) => {
          const j = d.data();
          return {
            id: d.id,
            postId: j.postId,
            platform: j.platform,
            status: j.status,
            publishAt: j.publishAt.toDate().toISOString(),
            providerId: j.providerId || null,
            error: j.error || null,
          };
        })
        .sort((a, b) => b.publishAt.localeCompare(a.publishAt));
    },
    async schedule({ clientId, postId, actor, publishAt }, now = Date.now()) {
      requirePilot(clientId);
      if (!/^[\w-]{1,128}$/.test(postId || ""))
        throw new PilotError("Invalid post ID.");
      // One stable queue slot per post prevents duplicate schedule requests from double-publishing.
      const ref = jobs.doc(`${clientId}_${postId}`);
      return db.runTransaction(async (tx) => {
        const current = await tx.get(ref);
        const data = await load(tx, { clientId, postId, actor });
        if (
          !data.member?.active ||
          !["admin", "editor"].includes(data.member.role)
        )
          throw new PilotError("Workspace access required.");
        const date = validateSchedule(data.post || {}, publishAt, now);
        assertConnection(data.connection, data.post.platform, now);
        if (data.post.assetId) {
          if (!/^[\w-]{1,128}$/.test(data.post.assetId))
            throw new PilotError("Invalid image asset.");
          const a = (
            await tx.get(
              db.doc(`${root}/clients/${clientId}/assets/${data.post.assetId}`),
            )
          ).data();
          if (
            !a ||
            a.objectPath !==
              `${root}/clients/${clientId}/assets/${data.post.assetId}` ||
            a.contentType !== "image/jpeg"
          )
            throw new PilotError(
              "Select an approved JPEG image from this client library.",
            );
        }
        if (data.connection.validUntil.toMillis() <= date.getTime())
          throw new PilotError(
            "Renew the Meta connection before scheduling this far ahead.",
          );
        if (
          current.exists &&
          ["processing", "sending", "published", "needs_attention"].includes(
            current.data().status,
          )
        )
          throw new PilotError(
            "This post has an active or completed publication. Review it before creating another post.",
          );
        const job = {
          clientId,
          postId,
          actor,
          platform: data.post.platform,
          revision: revision(data.post),
          pageId: data.connection.pageId,
          instagramId: data.connection.instagramId || null,
          status: "queued",
          phase: "prepare",
          publishAt: Timestamp.fromDate(date),
          dueAt: Timestamp.fromDate(date),
          updatedAt: Timestamp.fromMillis(now),
          attempts: 0,
        };
        tx.set(ref, job);
        log(
          tx,
          job,
          current.exists ? "schedule.rescheduled" : "schedule.created",
          now,
        );
        return ref.id;
      });
    },
    async cancel(id, actor, now = Date.now()) {
      return db.runTransaction(async (tx) => {
        const ref = jobs.doc(id),
          snap = await tx.get(ref);
        if (!snap.exists) throw new PilotError("Schedule not found.");
        const j = snap.data();
        requirePilot(j.clientId);
        if (!["queued", "processing"].includes(j.status))
          throw new PilotError(
            "Publication may already be underway; cancellation cannot be confirmed.",
          );
        tx.update(ref, {
          status: "cancelled",
          updatedAt: Timestamp.fromMillis(now),
        });
        log(tx, { ...j, actor }, "schedule.cancelled", now);
      });
    },
    async due(now) {
      return (
        await jobs
          .where("status", "==", "queued")
          .where("dueAt", "<=", Timestamp.fromMillis(now))
          .limit(1)
          .get()
      ).docs.map((d) => d.id);
    },
    async claim(id, now) {
      return db.runTransaction(async (tx) => {
        const ref = jobs.doc(id),
          s = await tx.get(ref);
        if (!s.exists) return null;
        const j = s.data();
        if (j.status !== "queued" || j.dueAt.toMillis() > now) return null;
        const lease = randomUUID();
        tx.update(ref, {
          status: "processing",
          lease,
          leaseUntil: Timestamp.fromMillis(now + 120000),
          attempts: j.attempts + 1,
          updatedAt: Timestamp.fromMillis(now),
        });
        return { ...j, id, lease };
      });
    },
    async context(job, now) {
      return db.runTransaction(async (tx) => {
        const s = await tx.get(jobs.doc(job.id));
        if (s.data()?.status !== "processing" || s.data()?.lease !== job.lease)
          throw new PilotError("Schedule was cancelled or claimed elsewhere.");
        const data = await load(tx, job);
        canExecute(job, data.post, data.member, data.connection, now);
        return data;
      });
    },
    async asset(job, post) {
      if (!post.assetId) return null;
      if (!/^[\w-]{1,128}$/.test(post.assetId))
        throw new PilotError("Invalid image asset.");
      const asset = (
        await db
          .doc(`${root}/clients/${job.clientId}/assets/${post.assetId}`)
          .get()
      ).data();
      if (
        !asset ||
        asset.objectPath !==
          `${root}/clients/${job.clientId}/assets/${post.assetId}` ||
        asset.contentType !== "image/jpeg"
      )
        throw new PilotError(
          "Pilot publication supports approved JPEG imagery only.",
        );
      return asset;
    },
    async markSending(job, now) {
      return db.runTransaction(async (tx) => {
        const ref = jobs.doc(job.id),
          s = await tx.get(ref);
        if (s.data()?.status !== "processing" || s.data()?.lease !== job.lease)
          throw new PilotError("Schedule was cancelled.");
        const data = await load(tx, job);
        canExecute(job, data.post, data.member, data.connection, now);
        tx.update(ref, {
          status: "sending",
          updatedAt: Timestamp.fromMillis(now),
        });
        return true;
      });
    },
    async finish(job, patch, now) {
      return db.runTransaction(async (tx) => {
        const ref = jobs.doc(job.id),
          s = await tx.get(ref);
        const current = s.data();
        if (
          !["processing", "sending"].includes(current?.status) ||
          current?.lease !== job.lease
        )
          return false;
        tx.update(ref, { ...patch, updatedAt: Timestamp.fromMillis(now) });
        if (patch.status !== "queued")
          log(tx, job, `publication.${patch.status}`, now);
        return true;
      });
    },
    async recover(now) {
      const expired = await jobs
        .where("status", "in", ["processing", "sending"])
        .where("leaseUntil", "<=", Timestamp.fromMillis(now))
        .limit(3)
        .get();
      for (const d of expired.docs)
        await db.runTransaction(async (tx) => {
          const s = await tx.get(d.ref),
            j = s.data();
          if (
            !["processing", "sending"].includes(j?.status) ||
            j.leaseUntil.toMillis() > now
          )
            return;
          tx.update(d.ref, {
            status: "needs_attention",
            error: "WORKER_INTERRUPTED_VERIFY_BEFORE_RETRY",
            updatedAt: Timestamp.fromMillis(now),
          });
          log(tx, j, "publication.needs_attention", now);
        });
    },
  };
}

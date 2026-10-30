export class PilotError extends Error {}
import { createHash } from "node:crypto";
export const WORKSPACE = "human-standard";
export const PILOT_CLIENT = "esk-cheap-shop";
export const root = `workspaces/${WORKSPACE}`;
export function requirePilot(clientId) {
  if (clientId !== PILOT_CLIENT)
    throw new PilotError(
      "Scheduling is limited to Esk Cheap Shop during the pilot.",
    );
}
export function revision(post) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        post.text,
        post.platform,
        post.assetId ?? null,
        post.updatedAt?.toMillis?.() ?? null,
        post.updatedBy ?? null,
      ]),
    )
    .digest("hex");
}
export function validateSchedule(post, dueAt, now = Date.now()) {
  if (post.status !== "approved")
    throw new PilotError("Approve the post before scheduling.");
  if (!["facebook", "instagram"].includes(post.platform))
    throw new PilotError("Unsupported channel.");
  if (
    typeof post.text !== "string" ||
    !post.text.trim() ||
    post.text.length > 2200
  )
    throw new PilotError("Invalid post copy.");
  if (post.platform === "instagram" && !post.assetId)
    throw new PilotError("Instagram requires an approved JPEG image.");
  const date = new Date(dueAt);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getTime() < now + 120000 ||
    date.getTime() > now + 30 * 86400000
  )
    throw new PilotError(
      "Choose a time between 2 minutes and 30 days from now.",
    );
  return date;
}
export function assertConnection(connection, platform, now = Date.now()) {
  if (
    !connection ||
    connection.clientId !== PILOT_CLIENT ||
    connection.active !== true ||
    connection.publishingVerified !== true ||
    !connection.channels?.includes(platform)
  )
    throw new PilotError(
      "The Esk Cheap Shop Meta connection has not been verified for this channel.",
    );
  if (
    !/^\d+$/.test(connection.pageId || "") ||
    (platform === "instagram" && !/^\d+$/.test(connection.instagramId || ""))
  )
    throw new PilotError("Invalid connected account mapping.");
  if (
    !Number.isFinite(connection.validUntil?.toMillis?.()) ||
    connection.validUntil.toMillis() <= now
  )
    throw new PilotError("The Meta connection needs renewal.");
}
export function canExecute(job, post, member, connection, now) {
  requirePilot(job.clientId);
  if (!member?.active || !["admin", "editor"].includes(member.role))
    throw new PilotError("The scheduling operator no longer has access.");
  if (!post || post.status !== "approved" || revision(post) !== job.revision)
    throw new PilotError(
      "Post approval has changed; schedule again after review.",
    );
  assertConnection(connection, post.platform, now);
  if (
    connection.pageId !== job.pageId ||
    (post.platform === "instagram" &&
      connection.instagramId !== job.instagramId)
  )
    throw new PilotError("Connected account changed; review the schedule.");
  if (now > job.publishAt.toMillis() + 15 * 60000)
    throw new PilotError(
      "The publication window was missed. Review before rescheduling.",
    );
}

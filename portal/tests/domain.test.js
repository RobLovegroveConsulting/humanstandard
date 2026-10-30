import { test } from "node:test";
import assert from "node:assert/strict";
import { profile, validateFile, canTransition } from "../src/domain.js";
test("profile requires name and valid palette", () => {
  assert.throws(() => profile({ name: "" }));
  assert.throws(() => profile({ name: "Client", colours: "green" }));
  assert.deepEqual(profile({ name: " Client ", colours: "#203E32" }).colours, [
    "#203E32",
  ]);
});
test("upload rejects active content and oversized files", () => {
  assert.throws(() => validateFile({ type: "image/svg+xml", size: 100 }));
  assert.throws(() =>
    validateFile({ type: "application/pdf", size: 21 * 1024 * 1024 }),
  );
  validateFile({ type: "image/png", size: 100 });
});
test("approval never schedules or bypasses human review", () => {
  assert.equal(canTransition("draft", "approved"), false);
  assert.equal(canTransition("approved", "scheduled"), false);
  assert.equal(canTransition("draft", "pending_approval"), true);
  assert.equal(canTransition("pending_approval", "approved"), true);
});

import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
const env = await initializeTestEnvironment({
  projectId: "demo-human-standard",
  firestore: { rules: readFileSync("firestore.rules", "utf8") },
});
const base = "workspaces/human-standard";
try {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, role] of [
      ["rob", "admin"],
      ["sam", "editor"],
      ["viewer", "viewer"],
    ])
      await setDoc(doc(db, `${base}/members/${uid}`), { active: true, role });
    await setDoc(doc(db, `${base}/clients/example`), { name: "Example" });
  });
  const rob = env
    .authenticatedContext("rob", { email_verified: true })
    .firestore();
  const sam = env
    .authenticatedContext("sam", { email_verified: true })
    .firestore();
  const outsider = env
    .authenticatedContext("outsider", { email_verified: true })
    .firestore();
  const unverified = env
    .authenticatedContext("rob", { email_verified: false })
    .firestore();
  const anon = env.unauthenticatedContext().firestore();
  for (const db of [anon, outsider, unverified])
    await assertFails(getDoc(doc(db, `${base}/clients/example`)));
  await assertSucceeds(getDoc(doc(sam, `${base}/clients/example`)));
  await assertFails(getDoc(doc(rob, "workspaces/another/clients/example")));
  await assertFails(
    setDoc(doc(outsider, `${base}/members/outsider`), {
      active: true,
      role: "admin",
    }),
  );
  await assertFails(
    updateDoc(doc(rob, `${base}/members/rob`), { role: "admin" }),
  );
  const client = {
    name: "Test Client",
    website: "",
    tone: "Warm",
    colours: ["#203E32"],
    status: "onboarding",
    updatedBy: "rob",
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(setDoc(doc(rob, `${base}/clients/test`), client));
  await assertFails(
    setDoc(
      doc(
        env
          .authenticatedContext("viewer", { email_verified: true })
          .firestore(),
        `${base}/clients/viewer`,
      ),
      { ...client, updatedBy: "viewer" },
    ),
  );
  const p = doc(rob, `${base}/clients/test/posts/p1`);
  const post = {
    text: "Draft copy",
    platform: "facebook",
    status: "draft",
    createdBy: "rob",
    updatedBy: "rob",
    updatedAt: serverTimestamp(),
  };
  await assertFails(setDoc(p, { ...post, status: "approved" }));
  await assertSucceeds(setDoc(p, post));
  await assertFails(
    updateDoc(p, { status: "scheduled", updatedAt: serverTimestamp() }),
  );
  await assertSucceeds(
    updateDoc(p, { status: "pending_approval", updatedAt: serverTimestamp() }),
  );
  await assertSucceeds(
    updateDoc(p, { status: "approved", updatedAt: serverTimestamp() }),
  );
  await assertFails(
    updateDoc(p, {
      text: "Changed after approval",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(rob, `${base}/activity/spoof`), {
      actor: "sam",
      clientId: "test",
      targetId: "p1",
      action: "post.approved",
      createdAt: serverTimestamp(),
    }),
  );
  console.log(
    "PASS: anonymous, non-member, unverified, cross-workspace, privilege escalation, viewer, approval bypass, post mutation and forged actor checks.",
  );
} finally {
  await env.cleanup();
}

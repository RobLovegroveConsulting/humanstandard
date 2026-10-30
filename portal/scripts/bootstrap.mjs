// Run only with explicitly authorised Google Application Default Credentials.
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
initializeApp({
  credential: applicationDefault(),
  projectId: "human-standard-workspace",
});
const db = getFirestore();
const accounts = [
  ["rob@roblovegrove.com", "admin"],
  ["sam@roblovegrove.com", "editor"],
];
// Requires pre-existing, verified accounts. Never create passwords in source.
const users = await Promise.all(
  accounts.map(async ([email, role]) => ({
    user: await getAuth().getUserByEmail(email),
    role,
  })),
);
if (users.some(({ user }) => !user.emailVerified || user.disabled))
  throw Error("Both accounts must be verified and enabled.");
const batch = db.batch();
for (const { user, role } of users)
  batch.set(
    db.doc(`workspaces/human-standard/members/${user.uid}`),
    { active: true, role },
    { merge: true },
  );
for (const [id, name] of [
  ["cumquats-australia", "Cumquats Australia"],
  ["esk-cheap-shop", "Esk Cheap Shop"],
  ["mitre-10-toogoolawah", "Mitre 10 Toogoolawah"],
]) {
  const d = db.doc(`workspaces/human-standard/clients/${id}`);
  if (!(await d.get()).exists)
    batch.create(d, {
      name,
      website: "",
      tone: "",
      colours: [],
      status: "onboarding",
      updatedBy: "bootstrap",
      updatedAt: FieldValue.serverTimestamp(),
    });
}
await batch.commit();
console.log("Workspace membership and initial clients prepared.");

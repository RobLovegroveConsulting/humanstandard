import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getBytes } from "firebase/storage";
const env = await initializeTestEnvironment({
  projectId: "demo-human-standard",
  firestore: { rules: readFileSync("firestore.rules", "utf8") },
  storage: { rules: readFileSync("storage.rules", "utf8") },
});
const base = "workspaces/human-standard";
try {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `${base}/members/rob`), {
      active: true,
      role: "admin",
    });
  });
  const rob = env
    .authenticatedContext("rob", { email_verified: true })
    .storage();
  const outsider = env
    .authenticatedContext("outsider", { email_verified: true })
    .storage();
  const anon = env.unauthenticatedContext().storage();
  const data = new Uint8Array([1, 2, 3]);
  const path = `${base}/clients/test/assets/logo`;
  await assertSucceeds(
    uploadBytes(ref(rob, path), data, { contentType: "image/png" }),
  );
  await assertSucceeds(getBytes(ref(rob, path)));
  await assertFails(getBytes(ref(outsider, path)));
  await assertFails(getBytes(ref(anon, path)));
  await assertFails(
    uploadBytes(ref(rob, `${base}/clients/test/assets/svg`), data, {
      contentType: "image/svg+xml",
    }),
  );
  await assertFails(
    uploadBytes(ref(rob, "workspaces/another/clients/test/assets/logo"), data, {
      contentType: "image/png",
    }),
  );
  await assertFails(
    uploadBytes(
      ref(rob, `${base}/clients/test/assets/large`),
      new Uint8Array(20 * 1024 * 1024 + 1),
      { contentType: "image/png" },
    ),
  );
  console.log(
    "PASS: authenticated storage upload/download, outsider/anonymous/cross-workspace denial, active content and size restrictions.",
  );
} finally {
  await env.cleanup();
}

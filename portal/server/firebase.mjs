import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
export function services() {
  const app =
    getApps()[0] ||
    initializeApp({
      credential: applicationDefault(),
      projectId: "human-standard-workspace",
      storageBucket: "human-standard-workspace.firebasestorage.app",
    });
  return { db: getFirestore(app), auth: getAuth(app), app };
}

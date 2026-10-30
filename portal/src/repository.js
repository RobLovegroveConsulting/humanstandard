import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { ref, uploadBytes, getBlob, deleteObject } from "firebase/storage";
import { db, storage, auth } from "./firebase";
import { profile, validateFile, canTransition, pilotClientId } from "./domain";
const root = "workspaces/human-standard";
export const path = (...parts) => [root, ...parts].join("/");
export async function membership() {
  const s = await getDoc(doc(db, path("members", auth.currentUser.uid)));
  if (!s.exists() || s.data().active !== true)
    throw Error("Your account has not been granted workspace access.");
  return s.data();
}
export async function clients() {
  return (await getDocs(collection(db, path("clients")))).docs
    .map((s) => ({ id: s.id, ...s.data() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
function audit(batch, clientId, action, targetId) {
  batch.set(doc(collection(db, path("activity"))), {
    actor: auth.currentUser.uid,
    clientId,
    action,
    targetId,
    createdAt: serverTimestamp(),
  });
}
export async function saveClient(data, id) {
  const value = profile(data);
  const target = id
    ? doc(db, path("clients", id))
    : value.name.toLowerCase() === "esk cheap shop"
      ? doc(db, path("clients", pilotClientId))
      : doc(collection(db, path("clients")));
  const batch = writeBatch(db);
  batch.set(
    target,
    { ...value, updatedAt: serverTimestamp(), updatedBy: auth.currentUser.uid },
    { merge: true },
  );
  audit(batch, target.id, id ? "client.updated" : "client.created", target.id);
  await batch.commit();
  return target.id;
}
export async function assets(clientId) {
  return (
    await getDocs(collection(db, path("clients", clientId, "assets")))
  ).docs.map((s) => ({ id: s.id, ...s.data() }));
}
export async function uploadAsset(clientId, file, category) {
  validateFile(file);
  const asset = doc(collection(db, path("clients", clientId, "assets")));
  const objectPath = path("clients", clientId, "assets", asset.id);
  await uploadBytes(ref(storage, objectPath), file, { contentType: file.type });
  const batch = writeBatch(db);
  batch.set(asset, {
    name: file.name,
    category,
    objectPath,
    contentType: file.type,
    size: file.size,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser.uid,
  });
  audit(batch, clientId, "asset.uploaded", asset.id);
  try {
    await batch.commit();
  } catch (e) {
    await deleteObject(ref(storage, objectPath)).catch(() => {});
    throw e;
  }
}
export async function downloadAsset(asset) {
  const blob = await getBlob(ref(storage, asset.objectPath));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = asset.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function posts(clientId) {
  return (
    await getDocs(collection(db, path("clients", clientId, "posts")))
  ).docs.map((s) => ({ id: s.id, ...s.data() }));
}
export async function saveDraft(clientId, data) {
  if (!data.text.trim() || data.text.length > 2200)
    throw Error("Enter post copy up to 2,200 characters.");
  const target = doc(collection(db, path("clients", clientId, "posts")));
  const batch = writeBatch(db);
  batch.set(target, {
    text: data.text.trim(),
    platform: data.platform,
    assetId: data.assetId || null,
    status: "draft",
    createdBy: auth.currentUser.uid,
    updatedBy: auth.currentUser.uid,
    updatedAt: serverTimestamp(),
  });
  audit(batch, clientId, "post.created", target.id);
  await batch.commit();
}
export async function transition(clientId, post, status) {
  if (!canTransition(post.status, status))
    throw Error("Invalid approval transition.");
  const batch = writeBatch(db);
  batch.update(doc(db, path("clients", clientId, "posts", post.id)), {
    status,
    updatedBy: auth.currentUser.uid,
    updatedAt: serverTimestamp(),
  });
  audit(batch, clientId, `post.${status}`, post.id);
  try {
    await batch.commit();
  } catch (error) {
    if (error.code === "permission-denied")
      throw Error(
        "Post could not be changed. If it is scheduled, cancel its schedule first.",
      );
    throw error;
  }
}
export async function activity() {
  return (
    await getDocs(
      query(
        collection(db, path("activity")),
        orderBy("createdAt", "desc"),
        limit(100),
      ),
    )
  ).docs.map((s) => ({ id: s.id, ...s.data() }));
}

async function schedulingRequest(data) {
  const token = await auth.currentUser.getIdToken();
  const response = await fetch("/.netlify/functions/pilot-schedule", {
    method: data ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw Error(
      "The pilot scheduling service is not available on this preview.",
    );
  }
  if (!response.ok) throw Error(result.error || "Scheduling request failed.");
  return result;
}
export const schedules = () => schedulingRequest();
export const schedulePost = (postId, publishAt) =>
  schedulingRequest({
    action: "schedule",
    clientId: pilotClientId,
    postId,
    publishAt,
  });
export const cancelSchedule = (jobId) =>
  schedulingRequest({ action: "cancel", clientId: pilotClientId, jobId });

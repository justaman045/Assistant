import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Item, ItemVersion, VersionSource } from "./types";

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createItem(
  uid: string,
  data: { title: string; content: string; contentType?: string; model?: string }
): Promise<string> {
  const itemRef = await addDoc(collection(db, "items"), {
    uid,
    title: data.title,
    content: data.content,
    contentType: data.contentType ?? "",
    model: data.model ?? "",
    versionCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, "items", itemRef.id, "versions"), {
    uid,
    content: data.content,
    versionNumber: 1,
    source: "initial" as VersionSource,
    createdAt: serverTimestamp(),
  });

  return itemRef.id;
}

// ─── Edit (creates a new version) ────────────────────────────────────────────

export async function updateItemContent(
  itemId: string,
  uid: string,
  content: string,
  title?: string,
  note?: string
): Promise<void> {
  const itemRef = doc(db, "items", itemId);
  const snap = await getDoc(itemRef);
  if (!snap.exists()) throw new Error("Item not found");

  const currentCount: number = snap.data().versionCount ?? 1;

  const updates: Record<string, unknown> = {
    content,
    updatedAt: serverTimestamp(),
    versionCount: increment(1),
  };
  if (title !== undefined) updates.title = title;
  await updateDoc(itemRef, updates);

  const versionData: Record<string, unknown> = {
    uid,
    content,
    versionNumber: currentCount + 1,
    source: "edit" as VersionSource,
    createdAt: serverTimestamp(),
  };
  if (note?.trim()) versionData.note = note.trim();

  await addDoc(collection(db, "items", itemId, "versions"), versionData);
}

// ─── Add regenerated version from Create page ─────────────────────────────────

export async function addVersionToItem(
  itemId: string,
  uid: string,
  content: string,
  source: VersionSource = "regenerated"
): Promise<void> {
  const itemRef = doc(db, "items", itemId);
  const snap = await getDoc(itemRef);
  if (!snap.exists()) throw new Error("Item not found");

  const currentCount: number = snap.data().versionCount ?? 1;

  await updateDoc(itemRef, {
    content,
    updatedAt: serverTimestamp(),
    versionCount: increment(1),
  });

  await addDoc(collection(db, "items", itemId, "versions"), {
    uid,
    content,
    versionNumber: currentCount + 1,
    source,
    createdAt: serverTimestamp(),
  });
}

// ─── Restore a version ────────────────────────────────────────────────────────

export async function restoreVersion(
  itemId: string,
  uid: string,
  version: ItemVersion
): Promise<void> {
  const itemRef = doc(db, "items", itemId);
  const snap = await getDoc(itemRef);
  if (!snap.exists()) throw new Error("Item not found");

  const currentCount: number = snap.data().versionCount ?? 1;

  await updateDoc(itemRef, {
    content: version.content,
    updatedAt: serverTimestamp(),
    versionCount: increment(1),
  });

  await addDoc(collection(db, "items", itemId, "versions"), {
    uid,
    content: version.content,
    versionNumber: currentCount + 1,
    source: "restored" as VersionSource,
    note: `Restored from v${version.versionNumber}`,
    createdAt: serverTimestamp(),
  });
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchUserItems(uid: string, max = 30): Promise<Item[]> {
  const q = query(
    collection(db, "items"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, "id">) }));
}

export async function fetchItemVersions(itemId: string): Promise<ItemVersion[]> {
  const q = query(
    collection(db, "items", itemId, "versions"),
    orderBy("versionNumber", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ItemVersion, "id">),
  }));
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteItemWithVersions(itemId: string): Promise<void> {
  const versionsSnap = await getDocs(collection(db, "items", itemId, "versions"));
  await Promise.all(versionsSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "items", itemId));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const VERSION_SOURCE_LABELS: Record<VersionSource, string> = {
  initial: "Initial save",
  edit: "Edited",
  regenerated: "Regenerated",
  restored: "Restored",
};

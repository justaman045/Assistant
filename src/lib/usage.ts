import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

export interface UsageRecord {
  id: string;
  uid: string;
  model: string;
  contentType: string;
  topic: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  tokensExact: boolean; // true = from API, false = estimated
  createdAt: Timestamp | null;
}

export async function saveUsageRecord(
  uid: string,
  data: Omit<UsageRecord, "id" | "uid" | "createdAt">
): Promise<void> {
  await addDoc(collection(db, "users", uid, "usage"), {
    uid,
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function fetchUsageRecords(uid: string, max = 300): Promise<UsageRecord[]> {
  const q = query(
    collection(db, "users", uid, "usage"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<UsageRecord, "id">),
  }));
}

/** Estimate tokens when the API doesn't return usage data. ~4 chars per token. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

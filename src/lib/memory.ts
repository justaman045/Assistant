import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  increment,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type MemoryCategory =
  | "expertise"
  | "style"
  | "audience"
  | "topics"
  | "preference"
  | "personal"
  | "rule";

export interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  source: string;
  type?: "auto" | "manual";
  createdAt: Timestamp;
  usageCount: number;
}

export async function addManualMemory(
  uid: string,
  content: string,
  category: MemoryCategory
): Promise<Memory> {
  const col = collection(db, "users", uid, "memories");
  const ref = await addDoc(col, {
    content, category, source: "manual", type: "manual",
    usageCount: 0, createdAt: serverTimestamp(),
  });
  return { id: ref.id, content, category, source: "manual", type: "manual", usageCount: 0, createdAt: serverTimestamp() as unknown as Timestamp };
}

export async function updateMemory(uid: string, memoryId: string, content: string): Promise<void> {
  await updateDoc(doc(db, "users", uid, "memories", memoryId), { content });
}

export const CATEGORY_META: Record<
  MemoryCategory,
  { label: string; color: string; description: string }
> = {
  expertise: {
    label: "Expertise",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    description: "Your professional background and skills",
  },
  style: {
    label: "Style",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
    description: "Your writing tone and style preferences",
  },
  audience: {
    label: "Audience",
    color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    description: "Who you write for",
  },
  topics: {
    label: "Topics",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    description: "Themes and subjects you care about",
  },
  preference: {
    label: "Preference",
    color: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
    description: "Your content preferences",
  },
  personal: {
    label: "Personal",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
    description: "Values and perspectives you've shared",
  },
  rule: {
    label: "Rule",
    color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    description: "Hard rules and things to always remember",
  },
};

export async function fetchMemories(uid: string, max = 50): Promise<Memory[]> {
  const q = query(
    collection(db, "users", uid, "memories"),
    orderBy("usageCount", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Memory, "id">) }));
}

export async function saveMemories(
  uid: string,
  items: Omit<Memory, "id" | "createdAt" | "usageCount">[]
) {
  const col = collection(db, "users", uid, "memories");
  await Promise.all(
    items.map((item) =>
      addDoc(col, { ...item, usageCount: 0, createdAt: serverTimestamp() })
    )
  );
}

export async function deleteMemory(uid: string, memoryId: string) {
  await deleteDoc(doc(db, "users", uid, "memories", memoryId));
}

export async function incrementUsage(uid: string, memoryIds: string[]) {
  await Promise.all(
    memoryIds.map((id) =>
      updateDoc(doc(db, "users", uid, "memories", id), { usageCount: increment(1) })
    )
  );
}

// Formats memories as a context block for injection into prompts
export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (memories.length === 0) return "";
  return memories.map((m) => `• ${m.content}`).join("\n");
}

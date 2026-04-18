import {
  collection, addDoc, updateDoc, deleteDoc, getDocs,
  doc, query, where, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PlannerTask, TaskStatus, TaskPriority } from "@/lib/types";

const COL = "tasks";

export async function fetchTasks(uid: string): Promise<PlannerTask[]> {
  const q = query(collection(db, COL), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PlannerTask, "id">) }));
}

export async function createTask(
  uid: string,
  data: { title: string; notes?: string; status: TaskStatus; priority: TaskPriority; dueDate?: string; tags?: string[] }
): Promise<PlannerTask> {
  const ref = await addDoc(collection(db, COL), {
    uid,
    ...data,
    createdAt: serverTimestamp(),
    completedAt: null,
  });
  return { id: ref.id, uid, createdAt: null, ...data };
}

export async function updateTask(id: string, fields: Partial<Omit<PlannerTask, "id" | "uid" | "createdAt">>): Promise<void> {
  const updates: Record<string, unknown> = { ...fields };
  if (fields.status === "done") updates.completedAt = serverTimestamp();
  else if (fields.status) updates.completedAt = null;
  await updateDoc(doc(db, COL, id), updates);
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  done: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
};

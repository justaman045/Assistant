import {
  collection, addDoc, updateDoc, deleteDoc, getDocs,
  doc, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Assistant, AssistantChat, AssistantMessage } from "./types";

const A_COL = "assistants";
const C_COL = "assistantChats";

export async function fetchAssistants(uid: string): Promise<Assistant[]> {
  const q = query(collection(db, A_COL), where("uid", "==", uid), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Assistant, "id">) }));
}

export async function createAssistant(
  uid: string,
  data: Pick<Assistant, "name" | "emoji" | "personality" | "description" | "systemPrompt" | "model">
): Promise<Assistant> {
  const clean = JSON.parse(JSON.stringify({ uid, ...data }));
  const ref = await addDoc(collection(db, A_COL), { ...clean, createdAt: serverTimestamp() });
  return { id: ref.id, uid, ...data, createdAt: null };
}

export async function updateAssistant(
  id: string,
  data: Partial<Pick<Assistant, "name" | "emoji" | "personality" | "description" | "systemPrompt" | "model">>
): Promise<void> {
  const clean = JSON.parse(JSON.stringify(data));
  await updateDoc(doc(db, A_COL, id), clean);
}

export async function deleteAssistant(id: string): Promise<void> {
  await deleteDoc(doc(db, A_COL, id));
}

export async function fetchChats(uid: string, assistantId: string): Promise<AssistantChat[]> {
  const q = query(
    collection(db, C_COL),
    where("uid", "==", uid),
    where("assistantId", "==", assistantId),
    orderBy("updatedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AssistantChat, "id">) }));
}

export async function createChat(
  uid: string,
  assistantId: string,
  firstMessage: string,
  initialMessages: AssistantMessage[] = []
): Promise<AssistantChat> {
  const title = firstMessage.slice(0, 60);
  const ref = await addDoc(collection(db, C_COL), {
    uid, assistantId, title,
    messages: initialMessages,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, uid, assistantId, title, messages: initialMessages, createdAt: null, updatedAt: null };
}

export async function saveMessages(chatId: string, messages: AssistantMessage[]): Promise<void> {
  // JSON round-trip strips undefined fields that Firestore rejects
  const sanitized = JSON.parse(JSON.stringify(messages.slice(-80)));
  await updateDoc(doc(db, C_COL, chatId), {
    messages: sanitized,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteChat(chatId: string): Promise<void> {
  await deleteDoc(doc(db, C_COL, chatId));
}

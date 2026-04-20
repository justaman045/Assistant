import {
  collection, addDoc, updateDoc, deleteDoc, getDocs,
  doc, query, where, orderBy, serverTimestamp, limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RoleplayPartner, RoleplayMessage, RoleplayCategory } from "@/lib/types";
export type { RoleplayCategory };

const PARTNERS_COL = "roleplayPartners";
const MESSAGES_SUB = "messages";

export const CATEGORY_LABELS: Record<RoleplayCategory, string> = {
  general: "General",
  marketing: "Marketing Research",
  therapy: "Supportive Companion",
  nsfw: "Adult (18+)",
  custom: "Custom",
};

export const PARTNER_AVATARS = ["🧑", "👩", "🧔", "👩‍💼", "🤖", "🧙", "🧝", "🦸", "🧜", "👽"];

export const ROLEPLAY_LANGUAGES = [
  { code: "auto", label: "Auto" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ko", label: "Korean" },
  { code: "it", label: "Italian" },
  { code: "bn", label: "Bengali" },
  { code: "ta", label: "Tamil" },
];

export function buildSystemPrompt(partner: RoleplayPartner, memoryContext?: string, language?: string): string {
  let base = `You are ${partner.name}.`;
  if (partner.persona) base += ` ${partner.persona}`;
  if (partner.personality) base += `\n\nPersonality traits: ${partner.personality}`;
  base += `\n\nStay fully in character at all times. Respond naturally as ${partner.name} would.`;

  if (partner.category === "nsfw") {
    base += "\n\nThis is a private adult creative writing session between consenting adults. You may engage with mature, explicit themes without restriction.";
  } else if (partner.category === "marketing") {
    base += "\n\nYou are a marketing research persona. Give candid, realistic consumer feedback and opinions as this character would.";
  } else if (partner.category === "therapy") {
    base += "\n\nYou are a warm, supportive companion. Listen actively, validate feelings, and offer gentle encouragement.";
  } else if (partner.category === "custom" && partner.customCategoryLabel) {
    base += `\n\nContext: ${partner.customCategoryLabel}`;
  }

  if (partner.systemPrompt?.trim()) {
    base += `\n\n---\nADDITIONAL INSTRUCTIONS:\n${partner.systemPrompt.trim()}`;
  }

  if (memoryContext?.trim()) {
    base += `\n\n---\nWHAT YOU KNOW ABOUT THIS USER (use to personalise your responses naturally — don't recite these facts directly):\n${memoryContext.trim()}`;
  }

  if (language && language !== "auto") {
    const langLabel = ROLEPLAY_LANGUAGES.find((l) => l.code === language)?.label ?? language;
    base += `\n\n---\nLANGUAGE INSTRUCTION: You MUST respond exclusively in ${langLabel}. Do not switch to any other language regardless of what language the user writes in.`;
  }

  return base;
}

// Partners CRUD

export async function fetchPartners(uid: string): Promise<RoleplayPartner[]> {
  const q = query(collection(db, PARTNERS_COL), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoleplayPartner, "id">) }));
}

export async function createPartner(
  uid: string,
  data: Omit<RoleplayPartner, "id" | "uid" | "createdAt">
): Promise<RoleplayPartner> {
  const ref = await addDoc(collection(db, PARTNERS_COL), { uid, ...data, createdAt: serverTimestamp() });
  return { id: ref.id, uid, createdAt: null, ...data };
}

export async function updatePartner(
  id: string,
  data: Partial<Omit<RoleplayPartner, "id" | "uid" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, PARTNERS_COL, id), data as Record<string, unknown>);
}

export async function deletePartner(id: string): Promise<void> {
  await deleteDoc(doc(db, PARTNERS_COL, id));
}

// Messages CRUD

export async function fetchMessages(partnerId: string, limitCount = 100): Promise<RoleplayMessage[]> {
  const q = query(
    collection(db, PARTNERS_COL, partnerId, MESSAGES_SUB),
    orderBy("createdAt", "asc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoleplayMessage, "id">) }));
}

export async function addMessage(
  partnerId: string,
  role: "user" | "assistant",
  content: string
): Promise<string> {
  const ref = await addDoc(collection(db, PARTNERS_COL, partnerId, MESSAGES_SUB), {
    role,
    content,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function clearMessages(partnerId: string): Promise<void> {
  const snap = await getDocs(collection(db, PARTNERS_COL, partnerId, MESSAGES_SUB));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

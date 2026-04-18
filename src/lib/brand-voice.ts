import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";

export type BrandVoice = NonNullable<UserProfile["brandVoice"]>;

export async function saveBrandVoice(uid: string, voice: BrandVoice): Promise<void> {
  await updateDoc(doc(db, "users", uid), { brandVoice: voice });
}

export async function loadBrandVoice(uid: string): Promise<BrandVoice | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return (snap.data() as UserProfile).brandVoice ?? null;
}

export function buildBrandVoiceBlock(voice: BrandVoice | null | undefined): string {
  if (!voice) return "";
  const parts: string[] = [];
  if (voice.tone) parts.push(`Tone: ${voice.tone}`);
  if (voice.style) parts.push(`Writing style: ${voice.style}`);
  if (voice.audience) parts.push(`Target audience: ${voice.audience}`);
  if (voice.avoidWords) parts.push(`Avoid these words/phrases: ${voice.avoidWords}`);
  if (voice.samplePhrase) parts.push(`Example of my voice: "${voice.samplePhrase}"`);
  if (!parts.length) return "";
  return `\n\nBrand Voice Guidelines:\n${parts.join("\n")}`;
}

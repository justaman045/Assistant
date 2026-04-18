import { doc, getDoc, updateDoc, collection, query, where, getDocs, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

const REFERRAL_CREDITS = 50;

export function generateReferralCode(uid: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seed = uid.slice(-6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    const charCode = seed.charCodeAt(i % seed.length);
    code += chars[charCode % chars.length];
  }
  return code;
}

export async function getReferralStats(
  referralCode: string
): Promise<{ count: number; creditsEarned: number }> {
  const q = query(collection(db, "users"), where("referredBy", "==", referralCode));
  const snap = await getDocs(q);
  return { count: snap.size, creditsEarned: snap.size * REFERRAL_CREDITS };
}

export async function claimReferral(
  newUid: string,
  referralCode: string
): Promise<{ success: boolean; error?: string }> {
  // Find the referrer
  const q = query(collection(db, "users"), where("referralCode", "==", referralCode));
  const snap = await getDocs(q);
  if (snap.empty) return { success: false, error: "Invalid referral code" };

  const referrerDoc = snap.docs[0];
  if (referrerDoc.id === newUid) return { success: false, error: "Cannot refer yourself" };

  // Check not already referred
  const newUserSnap = await getDoc(doc(db, "users", newUid));
  if (!newUserSnap.exists()) return { success: false, error: "User not found" };
  if (newUserSnap.data().referredBy) return { success: false, error: "Already claimed a referral" };

  // Award credits to referrer and mark new user
  await Promise.all([
    updateDoc(referrerDoc.ref, { credits: increment(REFERRAL_CREDITS) }),
    updateDoc(doc(db, "users", newUid), {
      referredBy: referralCode,
      credits: increment(REFERRAL_CREDITS),
    }),
  ]);

  return { success: true };
}

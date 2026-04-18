import {
  collection, addDoc, updateDoc, deleteDoc, getDocs,
  doc, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ManagedSubscription, BillingCycle } from "@/lib/types";

const COL = "managedSubscriptions";

export const SUB_CATEGORIES = [
  "Streaming", "Music", "Software", "Cloud", "News",
  "Gaming", "Fitness", "Learning", "Finance", "Other",
];

export async function fetchSubscriptions(uid: string): Promise<ManagedSubscription[]> {
  const q = query(collection(db, COL), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ManagedSubscription, "id">) }));
}

export async function addSubscription(
  uid: string,
  data: Omit<ManagedSubscription, "id" | "uid" | "createdAt">
): Promise<ManagedSubscription> {
  const ref = await addDoc(collection(db, COL), { uid, ...data, createdAt: serverTimestamp() });
  return { id: ref.id, uid, createdAt: null, ...data };
}

export async function updateSubscription(id: string, fields: Partial<ManagedSubscription>): Promise<void> {
  await updateDoc(doc(db, COL, id), fields);
}

export async function deleteSubscription(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export function monthlyEquivalent(sub: ManagedSubscription): number {
  if (sub.status !== "active") return 0;
  const amt = sub.amount;
  switch (sub.billingCycle) {
    case "weekly": return amt * 4.33;
    case "monthly": return amt;
    case "annual": return amt / 12;
    case "one-time": return 0;
  }
}

export function buildSubscriptionContext(subs: ManagedSubscription[]): string {
  return subs
    .map((s) => {
      const monthly = monthlyEquivalent(s).toFixed(0);
      const noteStr = s.notes ? ` | Note: "${s.notes}"` : "";
      return `${s.emoji ?? "•"} ${s.name} — ₹${s.amount}/${s.billingCycle} (~₹${monthly}/mo) | ${s.category} | ${s.status}${noteStr}`;
    })
    .join("\n");
}

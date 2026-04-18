import {
  collection, addDoc, updateDoc, deleteDoc, getDocs,
  doc, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FinanceTransaction, TransactionType } from "@/lib/types";

const COL = "transactions";

export const EXPENSE_CATEGORIES = [
  "Food & Dining", "Transport", "Shopping", "Entertainment",
  "Health", "Rent & Housing", "Utilities", "Education", "Travel", "Other",
];

export const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Business", "Investment", "Gift", "Refund", "Other",
];

export async function fetchTransactions(uid: string): Promise<FinanceTransaction[]> {
  const q = query(collection(db, COL), where("uid", "==", uid), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FinanceTransaction, "id">) }));
}

export async function addTransaction(
  uid: string,
  data: { amount: number; type: TransactionType; category: string; description: string; date: string }
): Promise<FinanceTransaction> {
  const ref = await addDoc(collection(db, COL), { uid, ...data, createdAt: serverTimestamp() });
  return { id: ref.id, uid, createdAt: null, ...data };
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export function summarize(txns: FinanceTransaction[]) {
  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  return { income, expense, net: income - expense };
}

export function buildAnalysisContext(txns: FinanceTransaction[]): string {
  return txns
    .map((t) => `[${t.date}] ${t.type === "expense" ? "-" : "+"}₹${t.amount} | ${t.category} | ${t.description}`)
    .join("\n");
}

import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = adminAuth();
  const db = adminDb();

  if (!auth || !db) return new Response("Server not configured", { status: 503 });

  const token = req.headers.get("Authorization")?.slice(7);
  if (!token) return new Response("Unauthorized", { status: 401 });

  let uid: string;
  try {
    uid = (await auth.verifyIdToken(token)).uid;
  } catch {
    return new Response("Invalid token", { status: 401 });
  }

  const [
    userSnap,
    tasksSnap,
    transactionsSnap,
    subscriptionsSnap,
    memoriesSnap,
    assistantsSnap,
  ] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("tasks").where("uid", "==", uid).orderBy("createdAt", "desc").get(),
    db.collection("transactions").where("uid", "==", uid).orderBy("date", "desc").get(),
    db.collection("managedSubscriptions").where("uid", "==", uid).get(),
    db.collection("users").doc(uid).collection("memories").get(),
    db.collection("assistants").where("uid", "==", uid).get(),
  ]);

  const toData = (snap: FirebaseFirestore.QuerySnapshot) =>
    snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const profile = userSnap.exists ? { id: userSnap.id, ...userSnap.data() } : null;

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile,
    tasks: toData(tasksSnap),
    transactions: toData(transactionsSnap),
    subscriptions: toData(subscriptionsSnap),
    memories: toData(memoriesSnap),
    assistants: toData(assistantsSnap),
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="dashboard-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

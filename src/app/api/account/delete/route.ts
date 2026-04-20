import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const SUBCOLLECTIONS = ["memories", "notifications"];

export async function DELETE(req: NextRequest) {
  const auth = adminAuth();
  const db = adminDb();

  if (!auth || !db) {
    return new Response("Server not configured", { status: 503 });
  }

  const token = req.headers.get("Authorization")?.slice(7);
  if (!token) return new Response("Unauthorized", { status: 401 });

  let uid: string;
  try {
    uid = (await auth.verifyIdToken(token)).uid;
  } catch {
    return new Response("Invalid token", { status: 401 });
  }

  try {
    // Delete subcollections first (Firestore doesn't cascade deletes)
    for (const sub of SUBCOLLECTIONS) {
      const snap = await db.collection("users").doc(uid).collection(sub).get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      if (!snap.empty) await batch.commit();
    }

    // Delete user-owned top-level documents
    const collections = [
      db.collection("tasks").where("uid", "==", uid),
      db.collection("transactions").where("uid", "==", uid),
      db.collection("managedSubscriptions").where("uid", "==", uid),
      db.collection("assistants").where("uid", "==", uid),
      db.collection("assistantChats").where("uid", "==", uid),
    ];

    for (const q of collections) {
      const snap = await q.get();
      if (snap.empty) continue;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // Delete the user document itself
    await db.collection("users").doc(uid).delete();

    // Delete Firebase Auth account
    await auth.deleteUser(uid);

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error("[account/delete] Error:", e);
    return new Response("Failed to delete account", { status: 500 });
  }
}

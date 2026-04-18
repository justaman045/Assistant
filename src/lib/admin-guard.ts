import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "./firebase-admin";

type GuardOk = { ok: true; uid: string };
type GuardFail = { ok: false; response: Response };
export type AdminGuardResult = GuardOk | GuardFail;

export async function requireAdmin(req: NextRequest): Promise<AdminGuardResult> {
  const auth = adminAuth();
  const db = adminDb();

  if (!auth || !db) {
    return {
      ok: false,
      response: new Response("Admin SDK not configured", { status: 503 }),
    };
  }

  const token = req.headers.get("Authorization")?.slice(7) ?? null;
  if (!token) {
    return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  }

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return { ok: false, response: new Response("Invalid token", { status: 401 }) };
  }

  const userDoc = await db.doc(`users/${uid}`).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) {
    return { ok: false, response: new Response("Forbidden", { status: 403 }) };
  }

  return { ok: true, uid };
}

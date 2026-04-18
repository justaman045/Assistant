import { NextRequest } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const REFERRAL_CREDITS = 50;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response("Unauthorized", { status: 401 });

    const auth = adminAuth();
    const db = adminDb();
    if (!auth || !db) return new Response("Server not configured", { status: 503 });

    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const { referralCode } = await req.json();
    if (!referralCode || typeof referralCode !== "string") {
      return Response.json({ error: "Missing referral code" }, { status: 400 });
    }

    const newUserRef = db.collection("users").doc(uid);
    const newUserSnap = await newUserRef.get();
    if (!newUserSnap.exists) return Response.json({ error: "User not found" }, { status: 404 });
    if (newUserSnap.data()?.referredBy) {
      return Response.json({ error: "Already claimed a referral" }, { status: 409 });
    }

    const referrerSnap = await db
      .collection("users")
      .where("referralCode", "==", referralCode.toUpperCase())
      .limit(1)
      .get();

    if (referrerSnap.empty) {
      return Response.json({ error: "Invalid referral code" }, { status: 404 });
    }
    const referrerRef = referrerSnap.docs[0].ref;
    if (referrerRef.id === uid) {
      return Response.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    await db.runTransaction(async (tx) => {
      tx.update(referrerRef, { credits: FieldValue.increment(REFERRAL_CREDITS) });
      tx.update(newUserRef, {
        referredBy: referralCode.toUpperCase(),
        credits: FieldValue.increment(REFERRAL_CREDITS),
      });
    });

    return Response.json({ success: true, creditsAwarded: REFERRAL_CREDITS });
  } catch (e) {
    console.error("Referral claim error:", e);
    return new Response("Internal server error", { status: 500 });
  }
}

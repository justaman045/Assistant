import { NextRequest } from "next/server";
import crypto from "crypto";
import { adminDb, adminAuth, FieldValue } from "@/lib/firebase-admin";
import { CREDIT_PACKS } from "@/lib/credits";

export async function POST(req: NextRequest) {
  const db = adminDb();
  const auth = adminAuth();
  if (!db || !auth) return new Response("Admin not configured", { status: 503 });

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return new Response("Razorpay not configured", { status: 503 });

  const token = req.headers.get("Authorization")?.slice(7);
  if (!token) return new Response("Unauthorized", { status: 401 });

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return new Response("Invalid token", { status: 401 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packId } =
    (await req.json()) as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      packId: string;
    };

  // Razorpay order signature: HMAC-SHA256(order_id + "|" + payment_id)
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return new Response("Invalid signature", { status: 400 });
  }

  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return new Response("Invalid pack", { status: 400 });

  await db.collection("users").doc(uid).update({
    credits: FieldValue.increment(pack.credits),
  });

  return Response.json({ success: true, creditsAdded: pack.credits });
}

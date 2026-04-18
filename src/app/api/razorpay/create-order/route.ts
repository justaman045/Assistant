import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { CREDIT_PACKS } from "@/lib/credits";

const RZP_BASE = "https://api.razorpay.com/v1";

function rzpAuth() {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) throw new Error("Razorpay credentials not configured");
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const auth = adminAuth();
  if (!auth) return new Response("Admin not configured", { status: 503 });

  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) return new Response("Razorpay not configured", { status: 503 });

  const token = req.headers.get("Authorization")?.slice(7);
  if (!token) return new Response("Unauthorized", { status: 401 });

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return new Response("Invalid token", { status: 401 });
  }

  const { packId } = (await req.json()) as { packId: string };
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return new Response("Invalid pack", { status: 400 });

  try {
    const res = await fetch(`${RZP_BASE}/orders`, {
      method: "POST",
      headers: { Authorization: rzpAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: pack.price * 100, // paise
        currency: "INR",
        receipt: `${uid.slice(0, 12)}_${packId.slice(5)}_${Date.now().toString(36)}`,
        notes: { uid, packId, credits: pack.credits },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[create-order] Razorpay error:", JSON.stringify(err));
      return Response.json(
        { error: err.error?.description ?? `Failed to create order (${res.status})` },
        { status: 502 }
      );
    }

    const order = await res.json();
    return Response.json({ orderId: order.id, keyId, pack });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[create-order]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

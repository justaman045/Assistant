import { NextRequest } from "next/server";
import crypto from "crypto";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { CREDIT_PACKS } from "@/lib/credits";
import { getPlan } from "@/lib/plans";

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return new Response("Not configured", { status: 503 });

  const db = adminDb();
  if (!db) return new Response("Admin not configured", { status: 503 });

  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(body, signature, webhookSecret)) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body) as {
    event: string;
    payload: {
      payment?: {
        entity: {
          id: string;
          order_id: string;
          notes?: { uid?: string; packId?: string; credits?: number };
        };
      };
      subscription?: {
        entity: {
          id: string;
          status: string;
          notes?: { uid?: string; planId?: string; billingCycle?: string };
          current_end?: number;
        };
      };
    };
  };

  // ── One-time credit pack purchase ──────────────────────────────────────────
  if (event.event === "payment.captured") {
    const payment = event.payload.payment?.entity;
    if (!payment) return new Response("OK", { status: 200 });

    const uid = payment.notes?.uid;
    const packId = payment.notes?.packId;
    if (!uid || !packId) return new Response("OK", { status: 200 });

    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) return new Response("OK", { status: 200 });

    // Idempotency: store payment ID to avoid double-crediting
    const paymentRef = db.collection("payments").doc(payment.id);
    const existing = await paymentRef.get();
    if (existing.exists) return new Response("OK", { status: 200 });

    await db.runTransaction(async (tx) => {
      tx.set(paymentRef, { uid, packId, credits: pack.credits, createdAt: new Date() });
      tx.update(db.collection("users").doc(uid), {
        credits: FieldValue.increment(pack.credits),
      });
    });
  }

  // ── Subscription charged (monthly/annual renewal) ─────────────────────────
  if (event.event === "subscription.charged") {
    const sub = event.payload.subscription?.entity;
    if (!sub) return new Response("OK", { status: 200 });

    const uid = sub.notes?.uid;
    const planId = sub.notes?.planId;
    if (!uid || !planId) return new Response("OK", { status: 200 });

    const plan = getPlan(planId);
    if (!plan) return new Response("OK", { status: 200 });

    // Set next expiry to end of current billing period + 3-day grace
    const expiresAt = sub.current_end
      ? new Date((sub.current_end + 259200) * 1000) // +3 days grace
      : new Date(Date.now() + 33 * 24 * 60 * 60 * 1000);

    await db.collection("users").doc(uid).update({
      plan: planId,
      planExpiresAt: expiresAt,
      credits: plan.credits,
    });
  }

  // ── Subscription cancelled or failed ──────────────────────────────────────
  if (event.event === "subscription.cancelled" || event.event === "subscription.halted") {
    const sub = event.payload.subscription?.entity;
    if (!sub) return new Response("OK", { status: 200 });

    const uid = sub.notes?.uid;
    if (!uid) return new Response("OK", { status: 200 });

    await db.collection("users").doc(uid).update({ plan: "free", planExpiresAt: null });
  }

  return new Response("OK", { status: 200 });
}

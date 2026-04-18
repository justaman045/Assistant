import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const RZP_BASE = "https://api.razorpay.com/v1";

// Razorpay plan IDs — create these once in the Razorpay dashboard and set env vars
const PLAN_ID_MAP: Record<string, string | undefined> = {
  starter: process.env.RAZORPAY_PLAN_STARTER,
  pro: process.env.RAZORPAY_PLAN_PRO,
  business: process.env.RAZORPAY_PLAN_BUSINESS,
};

function rzpAuth() {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) throw new Error("Razorpay credentials not configured");
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const auth = adminAuth();
  const db = adminDb();
  if (!auth || !db) return new Response("Admin not configured", { status: 503 });

  const token = req.headers.get("Authorization")?.slice(7);
  if (!token) return new Response("Unauthorized", { status: 401 });

  let uid: string;
  let email: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? "";
  } catch {
    return new Response("Invalid token", { status: 401 });
  }

  const { planId, billingCycle } = (await req.json()) as {
    planId: "starter" | "pro" | "business";
    billingCycle: "monthly" | "annual";
  };

  const rzpPlanId = PLAN_ID_MAP[planId];
  if (!rzpPlanId) {
    return Response.json({ error: "Plan not configured" }, { status: 503 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) return Response.json({ error: "Razorpay not configured" }, { status: 503 });

  try {
    const res = await fetch(`${RZP_BASE}/subscriptions`, {
      method: "POST",
      headers: { Authorization: rzpAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: rzpPlanId,
        total_count: billingCycle === "annual" ? 1 : 12,
        quantity: 1,
        customer_notify: 1,
        notes: { uid, planId, billingCycle, email },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json(
        { error: err.error?.description ?? "Failed to create subscription" },
        { status: 502 }
      );
    }

    const sub = await res.json();
    return Response.json({ subscriptionId: sub.id, keyId });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

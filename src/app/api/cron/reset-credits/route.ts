import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getPlan } from "@/lib/plans";

export const runtime = "nodejs";

// Runs on the 1st of every month via Vercel Cron (see vercel.json)
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.slice(7);
  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = adminDb();
  if (!db) return new Response("OK (dev — no admin)", { status: 200 });

  const usersSnap = await db.collection("users").get();
  const batch = db.batch();
  let count = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const planId: string = data.plan ?? "free";
    const plan = getPlan(planId);
    if (!plan) continue;

    // Only reset if user is on a paid plan (free users keep whatever they have + topups)
    if (planId === "free") continue;

    // Check plan hasn't expired
    const expiresAt: { toMillis?: () => number } | undefined = data.planExpiresAt;
    if (expiresAt && typeof expiresAt.toMillis === "function" && expiresAt.toMillis() < Date.now()) {
      // Plan expired — downgrade to free
      batch.update(doc.ref, { plan: "free", planExpiresAt: null });
      continue;
    }

    batch.update(doc.ref, { credits: plan.credits });
    count++;
  }

  await batch.commit();
  return Response.json({ reset: count });
}

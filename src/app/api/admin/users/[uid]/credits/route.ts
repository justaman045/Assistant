import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminDb, FieldValue } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const { uid } = await params;
  const body = (await req.json()) as { amount: number; note?: string };

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    return new Response("amount must be a non-zero number", { status: 400 });
  }

  const db = adminDb()!;
  const userRef = db.doc(`users/${uid}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("User not found");

    const data = snap.data() ?? {};
    const currentTokens: number = data.tokens ?? data.credits ?? 0;

    // Don't let tokens go below 0
    const newBalance = Math.max(0, currentTokens + amount);
    const actualChange = newBalance - currentTokens;

    tx.update(userRef, {
      tokens: newBalance,
      // If we removed tokens, add them to tokensUsed for accounting
      ...(actualChange < 0 && {
        tokensUsed: FieldValue.increment(Math.abs(actualChange)),
      }),
    });

    // Write an audit record
    const auditRef = db
      .collection("users")
      .doc(uid)
      .collection("creditAdjustments")
      .doc();

    tx.set(auditRef, {
      amount: actualChange,
      balanceAfter: newBalance,
      note: body.note?.trim() || "Admin adjustment",
      adminUid: guard.uid,
      createdAt: new Date(),
    });
  });

  const updated = await userRef.get();
  const updatedData = updated.data() ?? {};
  return Response.json({ ok: true, tokens: updatedData.tokens ?? updatedData.credits ?? 0 });
}

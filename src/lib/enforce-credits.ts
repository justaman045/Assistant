import { NextRequest } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/ratelimit";
import { getGenerationCost } from "@/lib/credits";

type CreditResult =
  | { uid: string; error: null }
  | { uid: null; error: Response };

/**
 * Verifies the Bearer token, enforces rate limiting, and deducts credits
 * in a single Firestore transaction. Returns uid on success, or a Response
 * ready to return on failure.
 *
 * In dev mode (no Firebase service account), skips enforcement and returns
 * uid="dev".
 */
export async function enforceCredits(
  req: NextRequest,
  model: string,
  rateLimitKey?: string
): Promise<CreditResult> {
  const auth = adminAuth();
  const db = adminDb();

  if (!auth || !db) {
    // Dev mode — no service account configured, skip enforcement
    return { uid: "dev", error: null };
  }

  const token = req.headers.get("Authorization")?.slice(7);
  if (!token) {
    return { uid: null, error: new Response("Unauthorized", { status: 401 }) };
  }

  let uid: string;
  try {
    uid = (await auth.verifyIdToken(token)).uid;
  } catch {
    return { uid: null, error: new Response("Invalid token", { status: 401 }) };
  }

  const key = rateLimitKey ?? `ai:${uid}`;
  if (!(await checkRateLimit(key, 30, 60_000))) {
    return { uid: null, error: new Response("Too many requests", { status: 429 }) };
  }

  const cost = getGenerationCost(model);
  try {
    await db.runTransaction(async (tx) => {
      const ref = db.collection("users").doc(uid);
      const snap = await tx.get(ref);
      const credits: number = snap.data()?.credits ?? 0;
      if (credits < cost) throw Object.assign(new Error("INSUFFICIENT_CREDITS"), { cost });
      tx.update(ref, {
        credits: FieldValue.increment(-cost),
        creditsUsed: FieldValue.increment(cost),
      });
    });
  } catch (e) {
    const err = e as Error & { cost?: number };
    if (err.message === "INSUFFICIENT_CREDITS") {
      return {
        uid: null,
        error: new Response(
          JSON.stringify({ error: "INSUFFICIENT_CREDITS", cost: err.cost ?? cost }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        ),
      };
    }
    console.error("[enforce-credits] Transaction error:", err);
    return { uid: null, error: new Response("Server error", { status: 500 }) };
  }

  return { uid, error: null };
}

/** Auth-only check (no credit deduction). Used for background/free model routes. */
export async function enforceAuth(req: NextRequest): Promise<{ uid: string; error: null } | { uid: null; error: Response }> {
  const auth = adminAuth();
  if (!auth) return { uid: "dev", error: null };

  const token = req.headers.get("Authorization")?.slice(7);
  if (!token) return { uid: null, error: new Response("Unauthorized", { status: 401 }) };

  try {
    const uid = (await auth.verifyIdToken(token)).uid;
    return { uid, error: null };
  } catch {
    return { uid: null, error: new Response("Invalid token", { status: 401 }) };
  }
}

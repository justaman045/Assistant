import { NextRequest } from "next/server";
import { LengthTarget } from "@/lib/types";
import { getSystemPrompt } from "@/lib/openrouter";
import { adminDb, adminAuth, FieldValue } from "@/lib/firebase-admin";
import { getGenerationCost, GENERATION_COST } from "@/lib/credits";
import { checkRateLimit } from "@/lib/ratelimit";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { logModelUsage } from "@/lib/model-usage";
import { openRouterErrorResponse } from "@/lib/openrouter-error";

// Node.js runtime — required for Firebase Admin SDK
// (Edge runtime cannot use firebase-admin)

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { topic, model, isFreeModel, contentType, memories, length, tone, brandVoice } = (await req.json()) as {
    topic: string;
    model: string;
    isFreeModel?: boolean;
    contentType: string;
    memories?: string[];
    length?: LengthTarget;
    tone?: string;
    brandVoice?: string;
  };

  if (!topic?.trim() || !model || !contentType?.trim()) {
    return new Response("Missing required fields", { status: 400 });
  }

  const apiKey = await getActiveApiKey();
  if (!apiKey) {
    return new Response("OpenRouter API key not configured", { status: 500 });
  }

  // Brand voice may be stripped for free-plan users inside the auth block below
  let effectiveBrandVoice = brandVoice;

  // ── Credit check (skipped in dev if FIREBASE_SERVICE_ACCOUNT is not set) ──
  const db = adminDb();
  const auth = adminAuth();

  if (db && auth) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return new Response("Invalid auth token", { status: 401 });
    }

    // 20 generations per minute per user
    if (!(await checkRateLimit(`gen:${uid}`, 20, 60_000))) {
      return new Response(
        JSON.stringify({ error: "RATE_LIMITED", message: "Too many requests. Please wait a moment." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    // Use isFreeModel from client (based on OpenRouter pricing=$0) as it's more accurate than
    // checking for `:free` suffix, which not all free-priced models include in their ID.
    const cost = isFreeModel ? GENERATION_COST.free_model : getGenerationCost(model);
    console.log("[generate] uid=%s model=%s isFreeModel=%s cost=%d", uid, model, isFreeModel, cost);

    // Brand voice is a paid feature — silently strip it for free-plan users rather
    // than erroring, so free users with saved brand voice data can still generate.
    if (brandVoice) {
      const userSnap = await db.collection("users").doc(uid).get();
      const plan = userSnap.data()?.plan ?? "free";
      if (plan === "free") effectiveBrandVoice = undefined;
    }

    try {
      await db.runTransaction(async (tx) => {
        const userRef = db.collection("users").doc(uid);
        const snap = await tx.get(userRef);
        const data = snap.data();
        const credits: number = data?.credits ?? 0;
        console.log("[generate] credits=%d cost=%d sufficient=%s", credits, cost, credits >= cost);

        if (credits < cost) {
          const err = new Error("INSUFFICIENT_CREDITS");
          Object.assign(err, { cost, balance: credits });
          throw err;
        }

        tx.update(userRef, {
          credits: FieldValue.increment(-cost),
          creditsUsed: FieldValue.increment(cost),
        });
      });
    } catch (e) {
      const err = e as Error & { cost?: number; balance?: number };
      if (err.message === "INSUFFICIENT_CREDITS") {
        return new Response(
          JSON.stringify({ error: "INSUFFICIENT_CREDITS", cost: err.cost ?? cost, balance: err.balance }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }
      throw e;
    }
  }

  // ── Build system prompt ───────────────────────────────────────────────────
  let systemPrompt = getSystemPrompt(contentType, length);

  if (tone) {
    systemPrompt += `\n\nTone: Write in a ${tone} tone throughout.`;
  }

  if (effectiveBrandVoice) {
    systemPrompt += `\n\n---\nBRAND VOICE (follow these guidelines precisely):\n${effectiveBrandVoice}`;
  }

  if (memories && memories.length > 0) {
    systemPrompt +=
      `\n\n---\nPERSONALIZATION — what you know about this specific user (use this to make the content feel authentically theirs, not generic):\n` +
      memories.map((m) => `• ${m}`).join("\n") +
      `\n\nWrite as if you deeply know this person. Match their voice, background, and audience naturally — don't mention these facts explicitly.`;
  }

  // ── Stream from OpenRouter ────────────────────────────────────────────────
  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://personal-dashboard.app",
      "X-Title": "Personal Dashboard",
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: topic.trim() },
      ],
    }),
  });

  if (!upstream.ok) return openRouterErrorResponse(upstream);

  logModelUsage(model, "content").catch(() => {});

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

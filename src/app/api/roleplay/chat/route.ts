import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/ratelimit";
import { getGenerationCost } from "@/lib/credits";
import { FieldValue } from "firebase-admin/firestore";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { logModelUsage } from "@/lib/model-usage";
import { openRouterErrorResponse } from "@/lib/openrouter-error";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = await getActiveApiKey();
  if (!apiKey) return new Response("OpenRouter not configured", { status: 500 });

  const { messages, systemPrompt, model } = (await req.json()) as {
    messages: { role: string; content: string }[];
    systemPrompt: string;
    model: string;
  };

  if (!messages?.length || !systemPrompt || !model) {
    return new Response("Missing required fields", { status: 400 });
  }

  const db = adminDb();
  const auth = adminAuth();
  let callerUid: string | undefined;

  if (db && auth) {
    const token = req.headers.get("Authorization")?.slice(7);
    if (!token) return new Response("Unauthorized", { status: 401 });

    let uid: string;
    try {
      uid = (await auth.verifyIdToken(token)).uid;
      callerUid = uid;
    } catch {
      return new Response("Invalid token", { status: 401 });
    }

    if (!(await checkRateLimit(`roleplay:${uid}`, 30, 60_000))) {
      return new Response("Too many requests", { status: 429 });
    }

    const cost = getGenerationCost(model);
    try {
      await db.runTransaction(async (tx) => {
        const ref = db.collection("users").doc(uid);
        const snap = await tx.get(ref);
        const credits: number = snap.data()?.credits ?? 0;
        if (credits < cost) throw Object.assign(new Error("INSUFFICIENT_CREDITS"), { cost });
        tx.update(ref, { credits: FieldValue.increment(-cost), creditsUsed: FieldValue.increment(cost) });
      });
    } catch (e) {
      const err = e as Error & { cost?: number };
      if (err.message === "INSUFFICIENT_CREDITS") {
        return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS", cost: err.cost ?? cost }), {
          status: 402, headers: { "Content-Type": "application/json" },
        });
      }
      console.error("[roleplay/chat] Firestore transaction error:", err);
      return new Response(`Credits check failed: ${err.message}`, { status: 500 });
    }
  }

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://personal-dashboard.app",
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!upstream.ok) return openRouterErrorResponse(upstream);

  logModelUsage(model, "roleplay", callerUid).catch(() => {});

  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}

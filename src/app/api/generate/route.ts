import { NextRequest } from "next/server";
import { LengthTarget } from "@/lib/types";
import { getSystemPrompt } from "@/lib/openrouter";
import { adminDb } from "@/lib/firebase-admin";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { logModelUsage } from "@/lib/model-usage";
import { openRouterErrorResponse } from "@/lib/openrouter-error";
import { enforceTokens, deductTokens, interceptTokenUsage } from "@/lib/tokens";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { topic, model, contentType, memories, length, tone, brandVoice } = (await req.json()) as {
    topic: string;
    model: string;
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
  if (!apiKey) return new Response("OpenRouter API key not configured", { status: 500 });

  const guard = await enforceTokens(req, `gen`);
  if (guard.error) return guard.error;
  const uid = guard.uid;

  // Brand voice: silently strip for free-plan users
  let effectiveBrandVoice = brandVoice;
  if (brandVoice && uid !== "dev") {
    const db = adminDb();
    if (db) {
      const snap = await db.collection("users").doc(uid).get();
      if ((snap.data()?.plan ?? "free") === "free") effectiveBrandVoice = undefined;
    }
  }

  // ── Build system prompt ─────────────────────────────────────────────────
  let systemPrompt = getSystemPrompt(contentType, length);
  if (tone) systemPrompt += `\n\nTone: Write in a ${tone} tone throughout.`;
  if (effectiveBrandVoice) systemPrompt += `\n\n---\nBRAND VOICE (follow these guidelines precisely):\n${effectiveBrandVoice}`;
  if (memories?.length) {
    systemPrompt +=
      `\n\n---\nPERSONALIZATION — what you know about this specific user:\n` +
      memories.map((m) => `• ${m}`).join("\n") +
      `\n\nWrite as if you deeply know this person. Match their voice naturally — don't mention these facts explicitly.`;
  }

  // ── Stream from OpenRouter with token usage tracking ────────────────────
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
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: topic.trim() },
      ],
    }),
  });

  if (!upstream.ok) return openRouterErrorResponse(upstream);

  logModelUsage(model, "content", uid).catch(() => {});

  const body = interceptTokenUsage(upstream, (tokensUsed) => {
    deductTokens(uid, tokensUsed).catch((e) =>
      console.error("[generate] token deduction failed:", e)
    );
  });

  return new Response(body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}

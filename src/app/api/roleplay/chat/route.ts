import { NextRequest } from "next/server";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { logModelUsage } from "@/lib/model-usage";
import { openRouterErrorResponse } from "@/lib/openrouter-error";
import { enforceTokens, deductTokens, interceptTokenUsage } from "@/lib/tokens";

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

  const guard = await enforceTokens(req, "roleplay");
  if (guard.error) return guard.error;
  const uid = guard.uid;

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
      stream_options: { include_usage: true },
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!upstream.ok) return openRouterErrorResponse(upstream);

  logModelUsage(model, "roleplay", uid).catch(() => {});

  const body = interceptTokenUsage(upstream, (tokensUsed) => {
    deductTokens(uid, tokensUsed).catch((e) =>
      console.error("[roleplay/chat] token deduction failed:", e)
    );
  });

  return new Response(body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}

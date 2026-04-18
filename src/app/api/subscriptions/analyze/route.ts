import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { logModelUsage } from "@/lib/model-usage";
import { openRouterErrorResponse } from "@/lib/openrouter-error";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = await getActiveApiKey();
  if (!apiKey) return new Response("OpenRouter not configured", { status: 500 });

  const auth = adminAuth();
  if (auth) {
    const token = req.headers.get("Authorization")?.slice(7);
    if (!token) return new Response("Unauthorized", { status: 401 });
    try { await auth.verifyIdToken(token); } catch { return new Response("Invalid token", { status: 401 }); }
  }

  const { subscriptions, question, model, memories } = await req.json() as {
    subscriptions: string;
    question: string;
    model: string;
    memories?: string[];
  };
  if (!subscriptions || !question || !model) return new Response("Missing fields", { status: 400 });

  let systemPrompt = `You are a subscription optimization advisor. The user will share their subscriptions (including personal notes explaining why some are kept). Respect those notes — if the user says "can't drop" or gives a family/shared reason, do NOT recommend dropping that subscription. Be specific and practical. Format your response clearly.`;

  if (memories?.length) {
    systemPrompt += `\n\n---\nWHAT YOU KNOW ABOUT THIS USER (use to give more personalised, relevant advice):\n${memories.map((m) => `• ${m}`).join("\n")}`;
  }

  const userMessage = `Here are my subscriptions:\n\n${subscriptions}\n\nMy question: ${question}`;

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
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
    }),
  });

  if (!upstream.ok) return openRouterErrorResponse(upstream);

  logModelUsage(model).catch(() => {});

  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}

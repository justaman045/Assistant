import { NextRequest } from "next/server";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { logModelUsage } from "@/lib/model-usage";
import { openRouterErrorResponse } from "@/lib/openrouter-error";
import { enforceTokens, deductTokens, interceptTokenUsage } from "@/lib/tokens";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = await getActiveApiKey();
  if (!apiKey) return new Response("OpenRouter not configured", { status: 500 });

  const { transactions, question, model, memories } = await req.json() as {
    transactions: string;
    question: string;
    model: string;
    memories?: string[];
  };
  if (!transactions || !question || !model) return new Response("Missing fields", { status: 400 });

  const credit = await enforceTokens(req, "finance");
  if (credit.error) return credit.error;

  let systemPrompt = `You are a personal finance analyst. The user will share their transaction data and ask questions. Be specific, actionable, and honest. Format your response clearly with bullet points or sections where helpful.`;

  if (memories?.length) {
    systemPrompt += `\n\n---\nWHAT YOU KNOW ABOUT THIS USER (use to give more personalised, relevant advice):\n${memories.map((m) => `• ${m}`).join("\n")}`;
  }

  const userMessage = `Here are my transactions:\n\n${transactions}\n\nMy question: ${question}`;

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
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
    }),
  });

  if (!upstream.ok) return openRouterErrorResponse(upstream);

  logModelUsage(model, "finance", credit.uid).catch(() => {});

  const body = interceptTokenUsage(upstream, (n) =>
    deductTokens(credit.uid, n).catch((e) => console.error("[finance] token deduction:", e))
  );
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}

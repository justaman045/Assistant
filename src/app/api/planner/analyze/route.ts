import { NextRequest } from "next/server";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { logModelUsage } from "@/lib/model-usage";
import { openRouterErrorResponse } from "@/lib/openrouter-error";
import { enforceTokens, deductTokens, interceptTokenUsage } from "@/lib/tokens";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = await getActiveApiKey();
  if (!apiKey) return new Response("OpenRouter not configured", { status: 500 });

  const { tasks, question, model = "openai/gpt-4o-mini", memories } = await req.json() as {
    tasks: string;
    question: string;
    model: string;
    memories?: string[];
  };

  const credit = await enforceTokens(req, "planner");
  if (credit.error) return credit.error;

  let system = `You are a productive personal assistant and task coach. You help people analyze their task list, identify bottlenecks, suggest prioritization strategies, and keep them on track.

Be concise, direct, and actionable. Use bullet points and numbered lists where helpful. Don't pad your response with pleasantries.`;

  if (memories?.length) {
    system += `\n\n---\nWHAT YOU KNOW ABOUT THIS USER (use to give more personalised, relevant advice):\n${memories.map((m) => `• ${m}`).join("\n")}`;
  }

  const userMsg = `Here are my current tasks:\n\n${tasks}\n\nQuestion: ${question}`;

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
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
    }),
  });

  if (!upstream.ok) return openRouterErrorResponse(upstream);

  logModelUsage(model, "planner", credit.uid).catch(() => {});

  const body = interceptTokenUsage(upstream, (n) =>
    deductTokens(credit.uid, n).catch((e) => console.error("[planner] token deduction:", e))
  );
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}

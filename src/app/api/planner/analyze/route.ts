import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { logModelUsage } from "@/lib/model-usage";
import { openRouterErrorResponse } from "@/lib/openrouter-error";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = adminAuth();
  if (auth) {
    const token = req.headers.get("Authorization")?.slice(7);
    if (!token) return new Response("Unauthorized", { status: 401 });
    try { await auth.verifyIdToken(token); } catch { return new Response("Invalid token", { status: 401 }); }
  }

  const apiKey = await getActiveApiKey();
  if (!apiKey) return new Response("OpenRouter not configured", { status: 500 });

  const { tasks, question, model = "openai/gpt-4o-mini", memories } = await req.json() as {
    tasks: string;
    question: string;
    model: string;
    memories?: string[];
  };

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
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
    }),
  });

  if (!upstream.ok) return openRouterErrorResponse(upstream);

  logModelUsage(model).catch(() => {});

  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}

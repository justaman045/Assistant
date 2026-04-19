import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getActiveApiKey } from "@/lib/openrouter-keys";

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

  const { description, model = "google/gemini-2.0-flash-001" } = await req.json() as { description: string; model?: string };
  if (!description?.trim()) return new Response("Description required", { status: 400 });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://personal-dashboard.app",
      "X-Title": "Personal Dashboard",
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        {
          role: "system",
          content: `You generate assistant configurations. Output ONLY a raw JSON object (no markdown, no code fences) with these fields:
{"name":"short catchy name 2-3 words","emoji":"single emoji","personality":"2-3 sentences on tone and style","systemPrompt":"150-300 word expert system prompt with specific domain knowledge and behavioral rules"}`,
        },
        {
          role: "user",
          content: description.trim(),
        },
      ],
    }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const body = await res.json(); detail = body?.error?.message ?? body?.message ?? detail; } catch { /* ignore */ }
    return new Response(detail, { status: 500 });
  }

  const json = await res.json();
  const raw: string = json.choices?.[0]?.message?.content ?? "{}";

  try {
    // Strip markdown code fences if present, then find the JSON object
    const stripped = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    const match = stripped.match(/\{[\s\S]*\}/);
    const data = JSON.parse(match ? match[0] : stripped);
    return Response.json({
      name: data.name ?? "",
      emoji: data.emoji ?? "🤖",
      personality: data.personality ?? "",
      systemPrompt: data.systemPrompt ?? "",
    });
  } catch {
    return new Response(`Could not parse model response: ${raw.slice(0, 200)}`, { status: 500 });
  }
}

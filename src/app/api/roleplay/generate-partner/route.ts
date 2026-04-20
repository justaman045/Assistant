import { NextRequest } from "next/server";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { logModelUsage } from "@/lib/model-usage";
import { openRouterErrorResponse } from "@/lib/openrouter-error";
import { enforceTokens, deductTokens } from "@/lib/tokens";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = await getActiveApiKey();
  if (!apiKey) return new Response("OpenRouter not configured", { status: 500 });

  const { description, model = "openai/gpt-4o-mini" } = await req.json() as { description: string; model?: string };
  if (!description?.trim()) return new Response("Description required", { status: 400 });

  const credit = await enforceTokens(req, "roleplay-gen");
  if (credit.error) return credit.error;

  const systemPrompt = `You are a creative AI partner designer. Based on the user's description, generate a detailed roleplay partner profile.

Return ONLY valid JSON (no markdown, no code blocks) in this exact structure:
{
  "name": "Character's full name",
  "persona": "2-4 sentences describing their background, role, history, and expertise",
  "personality": "5-8 comma-separated personality traits",
  "systemPrompt": "2-4 sentences of specific behavioral instructions for how this character should respond — their speech patterns, what they avoid, how they handle conflict, etc.",
  "suggestedCategory": "one of: general, marketing, therapy, nsfw, custom",
  "customCategoryLabel": "only if suggestedCategory is custom — describe the use case in a few words"
}`;

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
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: description.trim() },
      ],
    }),
  });

  if (!res.ok) return openRouterErrorResponse(res);

  logModelUsage(model, "roleplay-generate", credit.uid).catch(() => {});

  const data = await res.json() as { choices: { message: { content: string } }[]; usage?: { total_tokens: number } };
  const raw = data.choices[0]?.message?.content ?? "{}";
  deductTokens(credit.uid, data.usage?.total_tokens ?? 0).catch((e) => console.error("[roleplay-gen] token deduction:", e));

  try {
    const parsed = JSON.parse(raw);
    return Response.json(parsed);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return Response.json(JSON.parse(match[0])); } catch { /* fall through */ }
    }
    return Response.json({ error: "Failed to parse AI response", raw }, { status: 500 });
  }
}

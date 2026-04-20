import { NextRequest } from "next/server";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { logModelUsage } from "@/lib/model-usage";
import { openRouterErrorResponse } from "@/lib/openrouter-error";

export const runtime = "nodejs";

const EXPAND_MODEL = "google/gemini-2.0-flash-001";

export interface ExpandedPrompt {
  angle: string;
  description: string;
  prompt: string;
}

const ANGLES = [
  "Personal Story",
  "Contrarian Take",
  "Step-by-Step Guide",
  "Data & Evidence",
  "Vision & Prediction",
];

export async function POST(req: NextRequest) {
  const apiKey = await getActiveApiKey();
  if (!apiKey) return new Response("API key not configured", { status: 500 });

  const { idea, contentType } = (await req.json()) as {
    idea: string;
    contentType?: string;
  };

  if (!idea?.trim()) return new Response("Missing idea", { status: 400 });

  const contentTypeInstruction = contentType?.trim()
    ? `The output will be used as a prompt to generate a "${contentType}".`
    : "The prompts should work for any long-form content format.";

  const systemPrompt = `You are a world-class prompt engineer and content strategist. Transform a raw idea into 5 distinct, highly optimized content prompts — one for each of these angles: ${ANGLES.join(", ")}.

Each prompt must:
- Use its assigned angle's specific structure and logic
- Be self-contained and detailed enough that any AI can produce excellent content from it alone
- Be written as first-person instructions (the user is the author)
- Be specific to the given idea — never generic or interchangeable with other ideas
- Include guidance on tone, structure, and what to include/avoid

${contentTypeInstruction}

Return ONLY a valid JSON array — no markdown, no explanation, no code fences:
[
  {
    "angle": "${ANGLES[0]}",
    "description": "One sentence describing this approach",
    "prompt": "The full, detailed prompt..."
  },
  ...5 total
]`;

  const userMessage = `Raw idea: "${idea.trim()}"

Generate 5 optimized prompts, one per angle (${ANGLES.join(", ")}).`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://personal-dashboard.app",
        "X-Title": "Personal Dashboard",
      },
      body: JSON.stringify({
        model: EXPAND_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!res.ok) return openRouterErrorResponse(res);

    const json = await res.json();
    const raw: string = json.choices?.[0]?.message?.content ?? "[]";

    // Strip markdown fences if model wrapped the JSON
    const cleaned = raw.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();

    let prompts: ExpandedPrompt[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        prompts = parsed.filter(
          (p) =>
            typeof p.angle === "string" &&
            typeof p.description === "string" &&
            typeof p.prompt === "string" &&
            p.prompt.trim().length > 0
        );
      }
    } catch {
      return new Response("Failed to parse model response", { status: 500 });
    }

    logModelUsage(EXPAND_MODEL, "prompts").catch(() => {});
    return Response.json(prompts);
  } catch {
    return new Response("Failed to expand prompts", { status: 500 });
  }
}

import { NextRequest } from "next/server";
import { MemoryCategory } from "@/lib/memory";
import { getActiveApiKey } from "@/lib/openrouter-keys";
import { logModelUsage } from "@/lib/model-usage";
import { enforceAuth } from "@/lib/enforce-credits";

export const runtime = "nodejs";

const EXTRACTION_MODEL = "openai/gpt-oss-120b:free";

interface ExtractedMemory {
  content: string;
  category: MemoryCategory;
}

export async function POST(req: NextRequest) {
  const apiKey = await getActiveApiKey();
  if (!apiKey) return new Response("API key not configured", { status: 500 });

  const auth = await enforceAuth(req);
  if (auth.error) return auth.error;

  const { topic, content, existingMemories } = (await req.json()) as {
    topic: string;
    content: string;
    existingMemories: string[];
  };

  const knownContext =
    existingMemories.length > 0
      ? existingMemories.map((m) => `- ${m}`).join("\n")
      : "Nothing known yet.";

  const systemPrompt = `You are a personalization engine. Your job is to silently learn facts about a user from their AI content requests so future content can be tailored specifically to them.

Analyze the topic and generated content below, then extract NEW facts about this user.

RULES:
- Only extract facts clearly evidenced by the topic or content
- Do NOT repeat or rephrase anything already in "Already Known"
- Each fact must be one concise sentence stated as a fact about the user (e.g. "Works in B2B SaaS" not "The user works in...")
- Focus on durable facts (background, style, audience, values) not one-off details
- If nothing genuinely new can be learned, return an empty array
- Respond ONLY with a valid JSON array, no markdown, no explanation

Categories:
- expertise: professional background, skills, industry, role
- style: writing tone, structure, length, voice preferences
- audience: who they write for (e.g. "writes for senior engineers at startups")
- topics: recurring themes, industries, or subjects they cover
- preference: content preferences (e.g. prefers storytelling over data)
- personal: values, beliefs, goals, or personal perspectives shared`;

  const userPrompt = `TOPIC/PROMPT:
"""
${topic}
"""

GENERATED CONTENT (first 1500 chars):
"""
${content.slice(0, 1500)}
"""

ALREADY KNOWN ABOUT THIS USER:
${knownContext}

Extract 0–3 new facts as a JSON array:
[{"content": "...", "category": "expertise|style|audience|topics|preference|personal"}]`;

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
        model: EXTRACTION_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      return new Response("Extraction model error", { status: res.status });
    }

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "[]";

    const cleaned = raw.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();

    let extracted: ExtractedMemory[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        extracted = parsed.filter(
          (item) =>
            typeof item.content === "string" &&
            item.content.trim().length > 0 &&
            typeof item.category === "string"
        );
      }
    } catch {
      // Model returned malformed JSON — treat as empty
    }

    logModelUsage(EXTRACTION_MODEL, "memory", auth.uid).catch(() => {});
    return Response.json(extracted);
  } catch {
    return new Response("Failed to extract memories", { status: 500 });
  }
}

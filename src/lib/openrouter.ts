import { LengthTarget } from "./types";

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  supported_parameters?: string[];
}

export function supportsTools(model: OpenRouterModel): boolean {
  return model.supported_parameters?.includes("tools") ?? false;
}

export function formatContext(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function formatPrice(perToken: string): string {
  const n = parseFloat(perToken) * 1_000_000;
  if (n === 0) return "Free";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export function getSystemPrompt(contentType: string, length?: LengthTarget): string {
  const lengthInstruction = length
    ? `Target length: approximately ${length.count} ${length.unit}. Stay within 10% of this target.`
    : "Use a length that best fits the content type and topic.";

  return `You are an expert content creator who can write any type of content with the right tone, format, and style for its platform.

The user wants: ${contentType}

${lengthInstruction}

Guidelines:
- Adopt the exact conventions, tone, and structure that a "${contentType}" typically follows
- Match the platform's norms — a tweet thread reads differently from a newsletter, which reads differently from a Reddit post
- Be specific and engaging — no filler, no generic intros like "In today's fast-paced world"
- Write in first person as the user, not about the user
- If the content type implies a specific format (threads, sections, bullet points, headers), use it
- Deliver content that is ready to publish with zero editing needed`;
}

/** Parse an OpenRouter error response and return a clean human-readable message. */
export async function openRouterErrorResponse(res: Response): Promise<Response> {
  const raw = await res.text().catch(() => "");
  const msg = parseOpenRouterError(raw, res.status);
  return new Response(msg, { status: res.status });
}

export function parseOpenRouterError(raw: string, status: number): string {
  // Try to extract the message from OpenRouter's JSON envelope
  try {
    const json = JSON.parse(raw);
    const inner = json?.error?.message ?? json?.message ?? null;
    const metadata = json?.error?.metadata;

    if (inner) {
      // "no healthy upstream" → provider is down
      if (inner.includes("no healthy upstream") || status === 503) {
        return "The selected model's provider is temporarily unavailable. Please try a different model.";
      }
      // Rate limited by provider
      if (inner.toLowerCase().includes("rate limit") || status === 429) {
        return "Rate limit reached for this model. Wait a moment or switch to a different model.";
      }
      // Context too long
      if (inner.toLowerCase().includes("context") && inner.toLowerCase().includes("length")) {
        return "Your conversation is too long for this model's context window. Clear the chat and try again.";
      }
      // Invalid API key
      if (status === 401 || inner.toLowerCase().includes("invalid api key")) {
        return "Invalid OpenRouter API key. Update the active key in the admin panel.";
      }
      // Provider error with raw metadata
      if (metadata?.raw) {
        return `Provider error: ${String(metadata.raw).slice(0, 120)}`;
      }
      return inner.slice(0, 200);
    }
  } catch {
    // Not JSON — use raw text
  }

  // Fallback by status
  if (status === 503) return "The selected model's provider is temporarily unavailable. Try a different model.";
  if (status === 429) return "Rate limit reached. Wait a moment or switch models.";
  if (status === 401) return "Invalid OpenRouter API key. Check the admin panel.";
  if (status === 402) return "OpenRouter account has no credits. Top up at openrouter.ai.";

  return raw.slice(0, 200) || `Request failed (${status})`;
}

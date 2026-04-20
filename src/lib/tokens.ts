import { NextRequest } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/ratelimit";
import { MIN_TOKENS_TO_GENERATE } from "@/lib/credits";

type TokenResult = { uid: string; error: null } | { uid: null; error: Response };

/**
 * Verify auth + rate limit + minimum token balance.
 * Does NOT deduct tokens upfront — actual deduction happens post-generation
 * via deductTokens() so users are charged only for what they actually use.
 */
export async function enforceTokens(
  req: NextRequest,
  rateLimitKey?: string
): Promise<TokenResult> {
  const auth = adminAuth();
  const db = adminDb();
  if (!auth || !db) return { uid: "dev", error: null };

  const token = req.headers.get("Authorization")?.slice(7);
  if (!token) return { uid: null, error: new Response("Unauthorized", { status: 401 }) };

  let uid: string;
  try {
    uid = (await auth.verifyIdToken(token)).uid;
  } catch {
    return { uid: null, error: new Response("Invalid token", { status: 401 }) };
  }

  const key = rateLimitKey ?? `ai:${uid}`;
  if (!(await checkRateLimit(key, 30, 60_000))) {
    return { uid: null, error: new Response("Too many requests", { status: 429 }) };
  }

  const snap = await db.collection("users").doc(uid).get();
  // Fall back to credits field for users who haven't migrated yet
  const balance: number = snap.data()?.tokens ?? snap.data()?.credits ?? 0;
  if (balance < MIN_TOKENS_TO_GENERATE) {
    return {
      uid: null,
      error: new Response(
        JSON.stringify({ error: "INSUFFICIENT_TOKENS", balance, required: MIN_TOKENS_TO_GENERATE }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { uid, error: null };
}

/** Auth-only check — no token deduction. For free/background operations. */
export async function enforceAuth(
  req: NextRequest
): Promise<TokenResult> {
  const auth = adminAuth();
  if (!auth) return { uid: "dev", error: null };

  const token = req.headers.get("Authorization")?.slice(7);
  if (!token) return { uid: null, error: new Response("Unauthorized", { status: 401 }) };

  try {
    const uid = (await auth.verifyIdToken(token)).uid;
    return { uid, error: null };
  } catch {
    return { uid: null, error: new Response("Invalid token", { status: 401 }) };
  }
}

/** Deduct actual tokens used from the user's balance. Fire-and-forget safe. */
export async function deductTokens(uid: string, tokensUsed: number): Promise<void> {
  if (!tokensUsed || uid === "dev") return;
  const db = adminDb();
  if (!db) return;
  await db.collection("users").doc(uid).update({
    tokens: FieldValue.increment(-tokensUsed),
    tokensUsed: FieldValue.increment(tokensUsed),
  });
}

/**
 * Wraps an OpenRouter SSE upstream response.
 * Forwards all bytes to the client unchanged, but taps the stream to read
 * the usage event (requires stream_options.include_usage=true on the request)
 * and calls onTokensUsed() when the stream ends.
 */
export function interceptTokenUsage(
  upstream: Response,
  onTokensUsed: (total: number) => void
): ReadableStream<Uint8Array> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let totalTokens = 0;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Parse SSE events in this chunk looking for usage data
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.usage?.total_tokens) {
                totalTokens = parsed.usage.total_tokens;
              }
            } catch { /* not JSON */ }
          }

          controller.enqueue(value);
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      } finally {
        if (totalTokens > 0) onTokensUsed(totalTokens);
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

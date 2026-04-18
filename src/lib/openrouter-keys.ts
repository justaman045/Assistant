import { adminDb } from "@/lib/firebase-admin";

const COLLECTION = "adminConfig";
const DOC = "openrouter";

// In-memory cache — short TTL so key changes propagate quickly
let cache: { value: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

export function maskKey(key: string): string {
  if (key.length <= 12) return "***";
  return `${key.slice(0, 10)}...${key.slice(-5)}`;
}

export function generateKeyId(): string {
  return `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Invalidate cache so the next request re-fetches the active key. */
export function invalidateKeyCache() {
  cache = null;
}

/**
 * Returns the active OpenRouter API key.
 * Priority: Firestore adminConfig > OPENROUTER_API_KEY env var.
 */
export async function getActiveApiKey(): Promise<string | null> {
  const now = Date.now();
  if (cache && now < cache.expiresAt) return cache.value;

  const db = adminDb();
  if (db) {
    try {
      const snap = await db.collection(COLLECTION).doc(DOC).get();
      if (snap.exists) {
        const data = snap.data()!;
        const activeId: string | undefined = data.activeKeyId;

        // "env" means explicitly use the environment variable
        if (activeId !== "env") {
          const keys: ApiKeyRecord[] = data.keys ?? [];
          const active = keys.find((k) => k.id === activeId);
          if (active?.key) {
            cache = { value: active.key, expiresAt: now + CACHE_TTL_MS };
            return active.key;
          }
        }
      }
    } catch (e) {
      console.error("[openrouter-keys] Firestore fetch failed, falling back to env:", e);
    }
  }

  const envKey = process.env.OPENROUTER_API_KEY ?? null;
  if (envKey) cache = { value: envKey, expiresAt: now + CACHE_TTL_MS };
  return envKey;
}

export interface ApiKeyRecord {
  id: string;
  label: string;
  key: string;
  maskedKey: string;
  addedAt: string | null; // ISO date string
}

export interface OpenRouterConfig {
  activeKeyId: string | null;
  keys: ApiKeyRecord[];
}

/** Fetch the full config (for admin routes only — includes actual keys). */
export async function getOpenRouterConfig(): Promise<OpenRouterConfig> {
  const db = adminDb();
  if (!db) return { activeKeyId: null, keys: [] };

  const snap = await db.collection(COLLECTION).doc(DOC).get();
  if (!snap.exists) return { activeKeyId: null, keys: [] };

  const data = snap.data()!;
  return {
    activeKeyId: data.activeKeyId ?? null,
    keys: data.keys ?? [],
  };
}

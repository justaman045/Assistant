import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// In-memory fallback for dev mode (no Firebase service account)
interface Entry { count: number; reset: number; }
const memStore = new Map<string, Entry>();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memStore) {
    if (now > entry.reset) memStore.delete(key);
  }
}, 60_000);

/**
 * Returns true if the request is allowed, false if rate-limited.
 * Uses Firestore in production (survives multi-instance deploys).
 * Falls back to in-memory in dev mode.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const db = adminDb();
  if (!db) return checkRateLimitMemory(key, max, windowMs);

  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const docId = `${key}:${windowStart}`;
  const ref = db.collection("rateLimits").doc(docId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const count: number = snap.exists ? (snap.data()?.count ?? 0) : 0;
      if (count >= max) return false;
      tx.set(
        ref,
        {
          count: FieldValue.increment(1),
          expiresAt: new Date(windowStart + windowMs + 5000),
        },
        { merge: true }
      );
      return true;
    });
    return result;
  } catch {
    // If Firestore fails, fall back to allow (don't block legitimate traffic)
    return true;
  }
}

function checkRateLimitMemory(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.reset) {
    memStore.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

interface Entry {
  count: number;
  reset: number;
}

const store = new Map<string, Entry>();

// Periodically clear expired entries to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.reset) store.delete(key);
  }
}, 60_000);

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key     Unique key (uid, IP, etc.)
 * @param max     Max requests allowed in the window
 * @param windowMs  Window duration in ms
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

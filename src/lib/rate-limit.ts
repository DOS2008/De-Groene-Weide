/**
 * Fixed-window rate limit kept in memory. Good enough for one server
 * process; it resets on restart, which is fine for a contact form.
 */
export function createRateLimit({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return function allow(key: string, now: number = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    // Keep the map small: drop keys that have no recent hits.
    if (hits.size > 10_000) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }
    return true;
  };
}

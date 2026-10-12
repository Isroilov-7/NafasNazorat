import "server-only";

/**
 * In-memory sliding-window limiter for login attempts. Single-process app
 * (one container), so memory is sufficient; nginx adds an IP limit in front.
 */
const WINDOW_MS = 15 * 60 * 1000;
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, max: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.set(key, recent);
  return recent.length >= max;
}

export function recordAttempt(key: string, now = Date.now()): void {
  const list = hits.get(key) ?? [];
  list.push(now);
  hits.set(key, list);
  if (hits.size > 10_000) hits.clear(); // hard memory bound
}

export function clearAttempts(key: string): void {
  hits.delete(key);
}

export const RATE_LIMIT_WINDOW_MINUTES = WINDOW_MS / 60_000;

import { env } from "../env.js";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const buckets = new Map<string, { startedAt: number; count: number }>();

export function consumeChatRequest(userId: string, now = Date.now()): boolean {
  if (env.E2E || process.env.NODE_ENV === "development") return true;

  if (buckets.size > 10_000) {
    for (const [key, bucket] of buckets) {
      if (now - bucket.startedAt >= WINDOW_MS) buckets.delete(key);
    }
  }

  const current = buckets.get(userId);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    buckets.set(userId, { startedAt: now, count: 1 });
    return true;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

export function resetChatRateLimits(): void {
  buckets.clear();
}

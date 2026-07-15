let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1000;

export async function withNominatimRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const waitMs = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestAt));
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestAt = Date.now();
  return fn();
}

export function resetNominatimRateLimitForTests(): void {
  lastRequestAt = 0;
}

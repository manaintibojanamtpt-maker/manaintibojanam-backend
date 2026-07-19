let pausedUntilMs = 0;

export function getOwnerApiPausedUntilMs(): number {
  return pausedUntilMs;
}

export function pauseOwnerApiUntil(untilMs: number): void {
  pausedUntilMs = Math.max(pausedUntilMs, untilMs);
}

export function isOwnerApiPaused(): boolean {
  return Date.now() < pausedUntilMs;
}

export function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const retryAt = Date.parse(trimmed);
  if (Number.isFinite(retryAt)) {
    return Math.max(0, retryAt - Date.now());
  }

  return null;
}

export function pauseOwnerApiFromResponse(retryAfterHeader: string | null, fallbackMs = 60_000): void {
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader) ?? fallbackMs;
  pauseOwnerApiUntil(Date.now() + retryAfterMs);
}

export function resetOwnerApiRateLimitStateForTests(): void {
  pausedUntilMs = 0;
}

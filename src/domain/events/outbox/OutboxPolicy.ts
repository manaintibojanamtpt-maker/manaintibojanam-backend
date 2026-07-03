/** Outbox policy constants (M6 PR-1). */

export const OUTBOX_MAX_RETRY_ATTEMPTS = 5 as const;

export const OUTBOX_RETRY_BACKOFF_MS = [1000, 5000, 15000, 60000, 300000] as const;

export function resolveOutboxBackoffMs(attemptCount: number): number {
  const index = Math.min(attemptCount, OUTBOX_RETRY_BACKOFF_MS.length - 1);
  return OUTBOX_RETRY_BACKOFF_MS[index];
}

/**
 * Projection domain — retry policy (pure, M6 PR-4).
 */

import type { ProjectionFailure } from '../shared/ProjectionTypes';

export const PROJECTION_MAX_RETRY_ATTEMPTS = 5 as const;

export const PROJECTION_RETRY_BACKOFF_MS = [1000, 5000, 15000, 60000, 300000] as const;

export function resolveProjectionRetryDelayMs(attemptCount: number): number {
  const index = Math.min(Math.max(0, attemptCount - 1), PROJECTION_RETRY_BACKOFF_MS.length - 1);
  return PROJECTION_RETRY_BACKOFF_MS[index];
}

export function shouldRetryProjection(
  attemptCount: number,
  failure: Pick<ProjectionFailure, 'retryable'>,
  maxAttempts: number = PROJECTION_MAX_RETRY_ATTEMPTS
): boolean {
  if (!failure.retryable) return false;
  return attemptCount < maxAttempts;
}

export function shouldDeadLetterProjection(
  attemptCount: number,
  failure: Pick<ProjectionFailure, 'retryable'>,
  maxAttempts: number = PROJECTION_MAX_RETRY_ATTEMPTS
): boolean {
  return attemptCount >= maxAttempts || !failure.retryable;
}

export function buildProjectionFailure(
  eventId: string,
  eventType: string,
  reason: string,
  attemptCount: number,
  retryable = true
): ProjectionFailure {
  return { eventId, eventType, reason, retryable, attemptCount };
}

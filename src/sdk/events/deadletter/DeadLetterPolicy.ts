/**
 * EventSDK — dead-letter policy (M6 PR-2).
 * Pure policy — no queue implementation.
 */

import type { FailureReason } from '../dto/FailureReason';
import type { RetryAttempt } from '../dto/RetryAttempt';
import { OUTBOX_MAX_RETRY_ATTEMPTS } from '../../../domain/events/outbox/OutboxPolicy';

export interface DeadLetterPolicyConfig {
  readonly maxAttempts: number;
  readonly retryableCodes: readonly FailureReason['code'][];
}

export const DEFAULT_DEAD_LETTER_POLICY: DeadLetterPolicyConfig = {
  maxAttempts: OUTBOX_MAX_RETRY_ATTEMPTS,
  retryableCodes: ['HANDLER_ERROR', 'TIMEOUT'],
};

export function shouldDeadLetter(
  attemptCount: number,
  reason: FailureReason,
  policy: DeadLetterPolicyConfig = DEFAULT_DEAD_LETTER_POLICY
): boolean {
  if (attemptCount >= policy.maxAttempts) return true;
  if (!reason.retryable) return true;
  return !policy.retryableCodes.includes(reason.code);
}

export function buildRetryAttempt(
  attemptNumber: number,
  attemptedAt: string,
  reason?: FailureReason,
  nextRetryAt?: string
): RetryAttempt {
  return { attemptNumber, attemptedAt, reason, nextRetryAt };
}

export function resolveNextRetryAt(
  attemptCount: number,
  now: string,
  backoffMs: number
): string {
  const base = new Date(now).getTime();
  return new Date(base + backoffMs).toISOString();
}

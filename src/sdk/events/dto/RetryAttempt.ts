import type { FailureReason } from './FailureReason';

export interface RetryAttempt {
  readonly attemptNumber: number;
  readonly attemptedAt: string;
  readonly reason?: FailureReason;
  readonly nextRetryAt?: string;
}

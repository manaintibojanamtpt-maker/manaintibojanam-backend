import type { FailureReason } from './FailureReason';
import type { RetryAttempt } from './RetryAttempt';

export interface DeadLetterMetadata {
  readonly consumerGroup: string;
  readonly subscriptionId?: string;
  readonly failure: FailureReason;
  readonly attempts: readonly RetryAttempt[];
  readonly originalEventId: string;
  readonly deadLetteredAt: string;
}

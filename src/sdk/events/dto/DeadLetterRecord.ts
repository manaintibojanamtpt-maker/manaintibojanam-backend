import type { EventId, EventTypeName } from '../types/branded';
import type { EventEnvelope } from './EventEnvelope';

/** Dead-letter record for failed event processing. */
export interface DeadLetterRecord<TPayload = unknown> {
  readonly deadLetterId: string;
  readonly eventId: EventId;
  readonly type: EventTypeName;
  readonly envelope: EventEnvelope<TPayload>;
  readonly consumerGroup: string;
  readonly reason: string;
  readonly failedAt: string;
  readonly attemptCount: number;
}

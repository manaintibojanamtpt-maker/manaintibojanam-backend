import type { OutboxId, EventId, EventTypeName } from '../types/branded';
import type { EventVersion } from './EventVersion';
import type { EventEnvelope } from './EventEnvelope';

export type OutboxStatus = 'pending' | 'published' | 'failed' | 'dead_letter';

/** Durable outbox record — transactional emit-after-write. */
export interface OutboxRecord<TPayload = unknown> {
  readonly outboxId: OutboxId;
  readonly eventId: EventId;
  readonly type: EventTypeName;
  readonly version: EventVersion;
  readonly envelope: EventEnvelope<TPayload>;
  readonly status: OutboxStatus;
  readonly createdAt: string;
  readonly publishedAt?: string;
  readonly attemptCount: number;
  readonly lastError?: string;
}

import type { EventId, OutboxId } from '../types/branded';

export interface PublishResult {
  readonly eventId: EventId;
  readonly outboxId?: OutboxId;
  readonly publishedAt: string;
  readonly duplicate?: boolean;
}

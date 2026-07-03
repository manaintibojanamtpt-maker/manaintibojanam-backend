import type { EventId } from '../types/branded';

/** Consumer offset cursor for replay and idempotent consumption. */
export interface EventCursor {
  readonly consumerGroup: string;
  readonly lastEventId?: EventId;
  readonly lastProcessedAt?: string;
  readonly sequence?: number;
}

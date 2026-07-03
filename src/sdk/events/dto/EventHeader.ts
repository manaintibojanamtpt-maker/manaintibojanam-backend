import type { EventId, AggregateId, EventTypeName } from '../types/branded';
import type { EventVersion } from './EventVersion';

/** Immutable header for every domain event. */
export interface EventHeader {
  readonly eventId: EventId;
  readonly type: EventTypeName;
  readonly version: EventVersion;
  readonly aggregateType: string;
  readonly aggregateId: AggregateId;
  readonly occurredAt: string;
}

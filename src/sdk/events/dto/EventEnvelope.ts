import type { EventHeader } from './EventHeader';
import type { EventMetadata } from './EventMetadata';

/**
 * Canonical domain event — header + metadata + typed payload.
 * No platform may publish raw JSON; all events MUST use EventEnvelope<T>.
 */
export interface EventEnvelope<TPayload = unknown> {
  readonly header: EventHeader;
  readonly metadata: EventMetadata;
  readonly payload: TPayload;
}

/** Alias for EventEnvelope when referring to domain-originated events. */
export type DomainEvent<TPayload = unknown> = EventEnvelope<TPayload>;

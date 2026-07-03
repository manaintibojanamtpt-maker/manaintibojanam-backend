/**
 * Event Platform Law — M6 PR-1 foundation.
 * @see docs/adr/ADR-018-event-platform.md
 */

export const EVENT_PLATFORM_LAW = 'event-platform-law-v1' as const;

export const EVENT_PLATFORM_LAW_STATEMENTS = [
  'No platform may publish raw JSON — everything MUST use EventEnvelope<T>.',
  'Commands → Domain → Events (Outbox) → Projection → Read Models → Frozen SDKs → Presentation.',
  'Read SDKs (M1–M5) remain consumers only — never modified by Event Platform.',
  'Event Platform owns envelope, routing, outbox, schema registry — not business aggregates.',
  'All new functionality enters through the Command side.',
  'Provider-neutral — no Kafka, Pub/Sub, or RabbitMQ in foundation.',
] as const;

/**
 * EventSDK — event store document mappers (M6 PR-3).
 */

import type { EventEnvelope } from '../../dto/EventEnvelope';
import type { EventCursor } from '../../dto/EventCursor';
import { asEventId, asEventTypeName, asAggregateId, asCorrelationId, asCausationId } from '../../types/branded';

export function mapEnvelopeToEventStoreDocument<TPayload>(
  envelope: EventEnvelope<TPayload>,
  createdAt: string
): Record<string, unknown> {
  return {
    eventId: envelope.header.eventId,
    eventType: envelope.header.type,
    eventVersion: envelope.header.version,
    aggregateId: envelope.header.aggregateId,
    aggregateType: envelope.header.aggregateType,
    occurredAt: envelope.header.occurredAt,
    payload: envelope.payload,
    metadata: {
      tenantId: envelope.metadata.tenantId,
      correlationId: envelope.metadata.correlationId,
      causationId: envelope.metadata.causationId,
      traceId: envelope.metadata.traceId,
      source: envelope.metadata.source,
      idempotencyKey: envelope.metadata.idempotencyKey,
      custom: envelope.metadata.custom,
    },
    envelope,
    createdAt,
  };
}

export function mapDocumentToEnvelope(doc: Record<string, unknown>): EventEnvelope {
  if (doc.envelope && typeof doc.envelope === 'object') {
    return doc.envelope as EventEnvelope;
  }

  return {
    header: {
      eventId: asEventId(String(doc.eventId)),
      type: asEventTypeName(String(doc.eventType)),
      version: String(doc.eventVersion),
      aggregateType: String(doc.aggregateType),
      aggregateId: asAggregateId(String(doc.aggregateId)),
      occurredAt: String(doc.occurredAt ?? doc.createdAt),
    },
    metadata: {
      correlationId: asCorrelationId(String((doc.metadata as Record<string, unknown>)?.correlationId ?? '')),
      causationId: (doc.metadata as Record<string, unknown>)?.causationId
        ? asCausationId(String((doc.metadata as Record<string, unknown>).causationId))
        : undefined,
      tenantId: (doc.metadata as Record<string, unknown>)?.tenantId as import('../../core/types').TenantId | undefined,
      traceId: (doc.metadata as Record<string, unknown>)?.traceId as string | undefined,
      source: (doc.metadata as Record<string, unknown>)?.source as string | undefined,
      idempotencyKey: (doc.metadata as Record<string, unknown>)?.idempotencyKey as string | undefined,
    },
    payload: doc.payload,
  };
}

export function cursorAfterEvent(cursor: EventCursor, events: EventEnvelope[]): EventCursor {
  const last = events.at(-1);
  return {
    consumerGroup: cursor.consumerGroup,
    lastEventId: last?.header.eventId ?? cursor.lastEventId,
    lastProcessedAt: last?.header.occurredAt ?? cursor.lastProcessedAt,
  };
}

/**
 * EventSDK — outbox document mappers (M6 PR-3).
 */

import type { OutboxRecord } from '../../dto/OutboxRecord';
import type { EventEnvelope } from '../../dto/EventEnvelope';
import type { OutboxId, EventId, EventTypeName } from '../../types/branded';
import { asOutboxId, asEventId, asEventTypeName } from '../../types/branded';

export interface OutboxPersistenceDocument {
  readonly outboxId: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly payload: unknown;
  readonly metadata: Record<string, unknown>;
  readonly envelope: EventEnvelope;
  readonly status: string;
  readonly published: boolean;
  readonly publishedAt?: string;
  readonly createdAt: string;
  readonly attemptCount: number;
  readonly lastError?: string;
}

export function mapOutboxRecordToDocument<TPayload>(
  record: OutboxRecord<TPayload>
): Record<string, unknown> {
  const { envelope } = record;
  return {
    outboxId: record.outboxId,
    eventId: record.eventId,
    eventType: record.type,
    eventVersion: record.version,
    aggregateId: envelope.header.aggregateId,
    aggregateType: envelope.header.aggregateType,
    payload: envelope.payload,
    metadata: {
      tenantId: envelope.metadata.tenantId,
      correlationId: envelope.metadata.correlationId,
      causationId: envelope.metadata.causationId,
      traceId: envelope.metadata.traceId,
      source: envelope.metadata.source,
      idempotencyKey: envelope.metadata.idempotencyKey,
      publishedAt: envelope.metadata.publishedAt,
      custom: envelope.metadata.custom,
    },
    envelope,
    status: record.status,
    published: record.status === 'published',
    publishedAt: record.publishedAt,
    createdAt: record.createdAt,
    attemptCount: record.attemptCount,
    lastError: record.lastError,
  };
}

export function mapOutboxAppendToDocument<TPayload>(
  record: Omit<OutboxRecord<TPayload>, 'outboxId' | 'createdAt'>,
  outboxId: OutboxId,
  createdAt: string
): Record<string, unknown> {
  return mapOutboxRecordToDocument({
    ...record,
    outboxId,
    createdAt,
  });
}

export function mapDocumentToOutboxRecord(doc: Record<string, unknown>): OutboxRecord {
  const envelope = doc.envelope as EventEnvelope;
  return {
    outboxId: asOutboxId(String(doc.outboxId)),
    eventId: asEventId(String(doc.eventId)),
    type: asEventTypeName(String(doc.eventType)),
    version: String(doc.eventVersion),
    envelope,
    status: doc.status as OutboxRecord['status'],
    createdAt: String(doc.createdAt),
    publishedAt: doc.publishedAt ? String(doc.publishedAt) : undefined,
    attemptCount: Number(doc.attemptCount ?? 0),
    lastError: doc.lastError ? String(doc.lastError) : undefined,
  };
}

export function mapEnvelopeToOutboxAppend<TPayload>(
  envelope: EventEnvelope<TPayload>,
  status: OutboxRecord['status'] = 'pending'
): Omit<OutboxRecord<TPayload>, 'outboxId' | 'createdAt'> {
  return {
    eventId: envelope.header.eventId,
    type: envelope.header.type,
    version: envelope.header.version,
    envelope,
    status,
    attemptCount: 0,
  };
}

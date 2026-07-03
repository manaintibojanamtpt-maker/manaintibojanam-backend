/**
 * EventSDK — dead-letter document mappers (M6 PR-3).
 */

import type { DeadLetterRecord } from '../../dto/DeadLetterRecord';
import type { EventEnvelope } from '../../dto/EventEnvelope';
import { asEventId, asEventTypeName } from '../../types/branded';

export function mapDeadLetterToDocument<TPayload>(
  entry: Omit<DeadLetterRecord<TPayload>, 'deadLetterId' | 'failedAt'>,
  deadLetterId: string,
  failedAt: string
): Record<string, unknown> {
  const envelope = entry.envelope as EventEnvelope<TPayload>;
  return {
    deadLetterId,
    eventId: entry.eventId,
    eventType: entry.type,
    aggregateId: envelope.header.aggregateId,
    aggregateType: envelope.header.aggregateType,
    envelope: entry.envelope,
    consumerGroup: entry.consumerGroup,
    reason: entry.reason,
    attemptCount: entry.attemptCount,
    failedAt,
    correlationId: envelope.metadata.correlationId,
    metadata: envelope.metadata,
  };
}

export function mapDocumentToDeadLetterRecord(doc: Record<string, unknown>): DeadLetterRecord {
  return {
    deadLetterId: String(doc.deadLetterId),
    eventId: asEventId(String(doc.eventId)),
    type: asEventTypeName(String(doc.eventType)),
    envelope: doc.envelope as EventEnvelope,
    consumerGroup: String(doc.consumerGroup),
    reason: String(doc.reason),
    attemptCount: Number(doc.attemptCount ?? 0),
    failedAt: String(doc.failedAt),
  };
}

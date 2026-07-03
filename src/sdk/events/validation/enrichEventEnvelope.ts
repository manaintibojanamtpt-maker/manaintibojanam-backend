/**
 * EventSDK — envelope enrichment for publish pipeline (M6 PR-2).
 * Assigns eventId, correlationId, causationId, timestamp when missing.
 */

import type { EventEnvelope } from '../dto/EventEnvelope';
import type { ClockPort, UuidPort } from '../contracts/ports';
import {
  asAggregateId,
  asCausationId,
  asCorrelationId,
  asEventId,
  asEventTypeName,
} from '../types/branded';

export interface EnrichEnvelopeOptions {
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
  readonly causationId?: string;
}

export function enrichEventEnvelope<TPayload>(
  envelope: Partial<EventEnvelope<TPayload>> & {
    header: Partial<EventEnvelope<TPayload>['header']> & {
      type: string;
      version: string;
      aggregateType: string;
      aggregateId: string;
    };
    payload: TPayload;
  },
  options: EnrichEnvelopeOptions
): EventEnvelope<TPayload> {
  const now = options.clock.now();
  const eventId = envelope.header?.eventId ?? asEventId(options.uuid.generate());
  const correlationId =
    envelope.metadata?.correlationId ??
    asCorrelationId(options.uuid.generate());

  return {
    header: {
      eventId,
      type: asEventTypeName(envelope.header.type),
      version: envelope.header.version,
      aggregateType: envelope.header.aggregateType,
      aggregateId: asAggregateId(envelope.header.aggregateId),
      occurredAt: envelope.header.occurredAt ?? now,
    },
    metadata: {
      ...envelope.metadata,
      correlationId,
      causationId:
        envelope.metadata?.causationId ??
        (options.causationId ? asCausationId(options.causationId) : undefined),
      publishedAt: envelope.metadata?.publishedAt ?? now,
    },
    payload: envelope.payload,
  };
}

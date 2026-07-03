/**
 * Order event mapper — legacy order document → canonical EventEnvelope (M6 PR-5).
 */

import type { EventEnvelope } from '../../dto/EventEnvelope';
import type { ClockPort, UuidPort } from '../../contracts/ports';
import type { SdkResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import type {
  LegacyOrderDocument,
  OrderEventPublishContext,
} from '../../../../domain/events/orders/OrderEventMetadata';
import { buildOrderEventMetadataFields } from '../../../../domain/events/orders/OrderEventMetadata';
import { buildOrderCreatedPayload } from '../../../../domain/events/orders/OrderCreatedEvent';
import { buildOrderUpdatedPayload } from '../../../../domain/events/orders/OrderUpdatedEvent';
import { buildOrderCancelledPayload } from '../../../../domain/events/orders/OrderCancelledEvent';
import {
  ORDER_AGGREGATE_TYPE,
  ORDER_EVENT_SCHEMA_VERSION,
  ORDER_EVENT_TYPES,
} from '../../../../domain/events/orders/OrderEventSchema';
import {
  asAggregateId,
  asCausationId,
  asCorrelationId,
  asEventId,
  asEventTypeName,
} from '../../types/branded';
import type { TenantId } from '../../../core/types';
import type { OrderEventTelemetryHook } from './OrderEventTelemetry';
import { createOrderEventTelemetryEmitter } from './OrderEventTelemetry';

export interface OrderEventMapperOptions {
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
  readonly onTelemetry?: OrderEventTelemetryHook;
}

function resolveLegacyTimestamp(value: LegacyOrderDocument['createdAt'], fallback: string): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return fallback;
}

export class OrderEventMapper {
  constructor(private readonly options: OrderEventMapperOptions) {}

  private buildEnvelope<TPayload>(
    eventType: string,
    order: LegacyOrderDocument,
    context: OrderEventPublishContext,
    payload: TPayload,
    occurredAt: string
  ): EventEnvelope<TPayload> {
    const metadataFields = buildOrderEventMetadataFields(order, context);
    return {
      header: {
        eventId: asEventId(this.options.uuid.generate()),
        type: asEventTypeName(eventType),
        version: ORDER_EVENT_SCHEMA_VERSION,
        aggregateType: ORDER_AGGREGATE_TYPE,
        aggregateId: asAggregateId(order.id),
        occurredAt,
      },
      metadata: {
        tenantId: metadataFields.tenantId as TenantId,
        correlationId: asCorrelationId(metadataFields.correlationId),
        causationId: metadataFields.causationId
          ? asCausationId(metadataFields.causationId)
          : undefined,
        traceId: metadataFields.traceId,
        source: metadataFields.source,
        idempotencyKey: metadataFields.idempotencyKey,
        custom: {
          producer: metadataFields.source,
          payloadVersion: ORDER_EVENT_SCHEMA_VERSION,
        },
      },
      payload,
    };
  }

  mapCreated(
    order: LegacyOrderDocument,
    context: OrderEventPublishContext
  ): SdkResult<EventEnvelope> {
    const telemetry = createOrderEventTelemetryEmitter(
      this.options.onTelemetry,
      'mapCreated',
      order.id,
      context.correlationId
    );
    const payload = buildOrderCreatedPayload(order);
    if (!payload) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid order for created event' } };
    }
    const occurredAt = resolveLegacyTimestamp(order.createdAt, this.options.clock.now());
    const envelope = this.buildEnvelope(ORDER_EVENT_TYPES.CREATED, order, context, payload, occurredAt);
    telemetry.eventMapped(ORDER_EVENT_TYPES.CREATED);
    return sdkOk(envelope);
  }

  mapUpdated(
    order: LegacyOrderDocument,
    context: OrderEventPublishContext,
    options: { previousStatus?: string; updatedFields?: readonly string[] } = {}
  ): SdkResult<EventEnvelope> {
    const telemetry = createOrderEventTelemetryEmitter(
      this.options.onTelemetry,
      'mapUpdated',
      order.id,
      context.correlationId
    );
    const payload = buildOrderUpdatedPayload(order, options);
    if (!payload) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid order for updated event' } };
    }
    const occurredAt = resolveLegacyTimestamp(order.updatedAt ?? order.createdAt, this.options.clock.now());
    const envelope = this.buildEnvelope(ORDER_EVENT_TYPES.UPDATED, order, context, payload, occurredAt);
    telemetry.eventMapped(ORDER_EVENT_TYPES.UPDATED);
    return sdkOk(envelope);
  }

  mapCancelled(
    order: LegacyOrderDocument,
    context: OrderEventPublishContext,
    cancellationReason?: string
  ): SdkResult<EventEnvelope> {
    const telemetry = createOrderEventTelemetryEmitter(
      this.options.onTelemetry,
      'mapCancelled',
      order.id,
      context.correlationId
    );
    const payload = buildOrderCancelledPayload(order, cancellationReason);
    if (!payload) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid order for cancelled event' } };
    }
    const occurredAt = resolveLegacyTimestamp(order.updatedAt ?? order.createdAt, this.options.clock.now());
    const envelope = this.buildEnvelope(ORDER_EVENT_TYPES.CANCELLED, order, context, payload, occurredAt);
    telemetry.eventMapped(ORDER_EVENT_TYPES.CANCELLED);
    return sdkOk(envelope);
  }
}

export function createOrderEventMapper(options: OrderEventMapperOptions): OrderEventMapper {
  return new OrderEventMapper(options);
}

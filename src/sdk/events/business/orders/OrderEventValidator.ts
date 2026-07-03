/**
 * Order event validator — envelope + domain validation (M6 PR-5).
 */

import type { EventEnvelope } from '../../dto/EventEnvelope';
import type { SdkResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import type {
  LegacyOrderDocument,
  OrderEventPublishContext,
} from '../../../../domain/events/orders/OrderEventMetadata';
import {
  validateLegacyOrderDocument,
  validateOrderEventPublishContext,
  validateOrderEventEnvelopeFields,
  validateOrderCreatedPayload,
  validateOrderUpdatedPayload,
  validateOrderCancelledPayload,
} from '../../../../domain/events/orders/OrderEventValidation';
import type { OrderCreatedPayload } from '../../../../domain/events/orders/OrderCreatedEvent';
import type { OrderUpdatedPayload } from '../../../../domain/events/orders/OrderUpdatedEvent';
import type { OrderCancelledPayload } from '../../../../domain/events/orders/OrderCancelledEvent';
import { ORDER_EVENT_TYPES } from '../../../../domain/events/orders/OrderEventSchema';
import type { OrderEventTelemetryHook } from './OrderEventTelemetry';
import { createOrderEventTelemetryEmitter } from './OrderEventTelemetry';

export class OrderEventValidator {
  constructor(private readonly onTelemetry?: OrderEventTelemetryHook) {}

  validateMappingInput(
    order: LegacyOrderDocument,
    context: OrderEventPublishContext
  ): SdkResult<void> {
    const errors = [
      ...validateLegacyOrderDocument(order),
      ...validateOrderEventPublishContext(context),
    ];
    if (errors.length > 0) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: errors.join('; ') } };
    }
    return sdkOk(undefined);
  }

  validateEnvelope(envelope: EventEnvelope): SdkResult<void> {
    const telemetry = createOrderEventTelemetryEmitter(
      this.onTelemetry,
      'validateEnvelope',
      envelope.header.aggregateId,
      envelope.metadata.correlationId
    );

    const errors = validateOrderEventEnvelopeFields({
      aggregateId: envelope.header.aggregateId,
      tenantId: envelope.metadata.tenantId ?? '',
      correlationId: envelope.metadata.correlationId,
      schemaVersion: envelope.header.version,
      occurredAt: envelope.header.occurredAt,
    });

    if (errors.length > 0) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: errors.join('; ') } };
    }

    const eventType = envelope.header.type;
    if (eventType === ORDER_EVENT_TYPES.CREATED) {
      const payloadErrors = validateOrderCreatedPayload(envelope.payload as OrderCreatedPayload);
      if (payloadErrors.length > 0) {
        return { ok: false, error: { code: 'VALIDATION_FAILED', message: payloadErrors.join('; ') } };
      }
    } else if (eventType === ORDER_EVENT_TYPES.UPDATED) {
      const payloadErrors = validateOrderUpdatedPayload(envelope.payload as OrderUpdatedPayload);
      if (payloadErrors.length > 0) {
        return { ok: false, error: { code: 'VALIDATION_FAILED', message: payloadErrors.join('; ') } };
      }
    } else if (eventType === ORDER_EVENT_TYPES.CANCELLED) {
      const payloadErrors = validateOrderCancelledPayload(envelope.payload as OrderCancelledPayload);
      if (payloadErrors.length > 0) {
        return { ok: false, error: { code: 'VALIDATION_FAILED', message: payloadErrors.join('; ') } };
      }
    } else {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: `Unsupported order event type: ${eventType}` },
      };
    }

    telemetry.eventValidated(eventType);
    return sdkOk(undefined);
  }
}

export function createOrderEventValidator(onTelemetry?: OrderEventTelemetryHook): OrderEventValidator {
  return new OrderEventValidator(onTelemetry);
}

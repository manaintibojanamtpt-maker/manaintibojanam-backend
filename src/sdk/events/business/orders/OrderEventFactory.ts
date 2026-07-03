/**
 * Order event factory — builds canonical envelopes from legacy orders (M6 PR-5).
 */

import type { EventEnvelope } from '../../dto/EventEnvelope';
import type { SdkResult } from '../../../core/result';
import type {
  LegacyOrderDocument,
  OrderEventPublishContext,
} from '../../../../domain/events/orders/OrderEventMetadata';
import type { ClockPort, UuidPort } from '../../contracts/ports';
import { createOrderEventMapper, type OrderEventMapper } from './OrderEventMapper';
import { createOrderEventValidator, type OrderEventValidator } from './OrderEventValidator';
import type { OrderEventTelemetryHook } from './OrderEventTelemetry';

export interface OrderEventFactoryOptions {
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
  readonly onTelemetry?: OrderEventTelemetryHook;
}

export class OrderEventFactory {
  private readonly mapper: OrderEventMapper;
  private readonly validator: OrderEventValidator;

  constructor(options: OrderEventFactoryOptions) {
    this.mapper = createOrderEventMapper(options);
    this.validator = createOrderEventValidator(options.onTelemetry);
  }

  createOrderCreatedEvent(
    order: LegacyOrderDocument,
    context: OrderEventPublishContext
  ): SdkResult<EventEnvelope> {
    const input = this.validator.validateMappingInput(order, context);
    if (!input.ok) return input;
    const mapped = this.mapper.mapCreated(order, context);
    if (!mapped.ok) return mapped;
    const validated = this.validator.validateEnvelope(mapped.value);
    if (!validated.ok) return validated;
    return mapped;
  }

  createOrderUpdatedEvent(
    order: LegacyOrderDocument,
    context: OrderEventPublishContext,
    options: { previousStatus?: string; updatedFields?: readonly string[] } = {}
  ): SdkResult<EventEnvelope> {
    const input = this.validator.validateMappingInput(order, context);
    if (!input.ok) return input;
    const mapped = this.mapper.mapUpdated(order, context, options);
    if (!mapped.ok) return mapped;
    const validated = this.validator.validateEnvelope(mapped.value);
    if (!validated.ok) return validated;
    return mapped;
  }

  createOrderCancelledEvent(
    order: LegacyOrderDocument,
    context: OrderEventPublishContext,
    cancellationReason?: string
  ): SdkResult<EventEnvelope> {
    const input = this.validator.validateMappingInput(order, context);
    if (!input.ok) return input;
    const mapped = this.mapper.mapCancelled(order, context, cancellationReason);
    if (!mapped.ok) return mapped;
    const validated = this.validator.validateEnvelope(mapped.value);
    if (!validated.ok) return validated;
    return mapped;
  }
}

export function createOrderEventFactory(options: OrderEventFactoryOptions): OrderEventFactory {
  return new OrderEventFactory(options);
}

/**
 * Order shadow publisher — first business event producer (M6 PR-5).
 * Shadow only: outbox persist via ShadowPublisher. No dispatch, subscribers, or projections.
 * Failures MUST NOT fail legacy order creation.
 */

import type { EventPublisherPort } from '../../contracts/ports';
import type { ClockPort, UuidPort } from '../../contracts/ports';
import type { EventId, EventTypeName, OutboxId } from '../../types/branded';
import type {
  LegacyOrderDocument,
  OrderEventPublishContext,
} from '../../../../domain/events/orders/OrderEventMetadata';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../../core/featureFlags';
import { sdkOk } from '../../../core/resultHelpers';
import type { SdkAsyncResult } from '../../../core/result';
import { createOrderEventFactory, type OrderEventFactory } from './OrderEventFactory';
import { createOrderEventPublisher, type OrderEventPublisher } from './OrderEventPublisher';
import type { OrderEventTelemetryHook } from './OrderEventTelemetry';
import { createOrderEventTelemetryEmitter } from './OrderEventTelemetry';

export interface OrderShadowPublishOutcome {
  readonly published: boolean;
  readonly skipped?: boolean;
  readonly eventId?: EventId;
  readonly outboxId?: OutboxId;
  readonly eventType?: EventTypeName;
  readonly reason?: string;
}

export interface OrderShadowPublisherOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly publisher: EventPublisherPort;
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
  readonly onTelemetry?: OrderEventTelemetryHook;
  readonly eventFactory?: OrderEventFactory;
  readonly eventPublisher?: OrderEventPublisher;
}

export class OrderShadowPublisher {
  private readonly eventFactory: OrderEventFactory;
  private readonly eventPublisher: OrderEventPublisher;

  constructor(private readonly options: OrderShadowPublisherOptions) {
    this.eventFactory =
      options.eventFactory ??
      createOrderEventFactory({
        clock: options.clock,
        uuid: options.uuid,
        onTelemetry: options.onTelemetry,
      });
    this.eventPublisher =
      options.eventPublisher ??
      createOrderEventPublisher({
        publisher: options.publisher,
        onTelemetry: options.onTelemetry,
      });
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readEventFlagDefault;
    return (
      readFlag('FF_EVENT_PLATFORM_ENABLED') &&
      readFlag('FF_EVENT_OUTBOX_ENABLED') &&
      readFlag('FF_EVENT_SHADOW_PUBLISHING_ENABLED') &&
      readFlag('FF_ORDER_SHADOW_EVENTS_ENABLED')
    );
  }

  private skippedOutcome(reason = 'flags_off'): OrderShadowPublishOutcome {
    return { published: false, skipped: true, reason };
  }

  private failedOutcome(reason: string, eventType?: EventTypeName): OrderShadowPublishOutcome {
    return { published: false, reason, eventType };
  }

  private successOutcome(
    eventType: EventTypeName,
    eventId: EventId,
    outboxId?: OutboxId
  ): OrderShadowPublishOutcome {
    return { published: true, eventType, eventId, outboxId };
  }

  /** Never throws — safe to call after legacy Firestore write. */
  private async safePublish(
    method: string,
    order: LegacyOrderDocument,
    context: OrderEventPublishContext,
    build: () => ReturnType<OrderEventFactory['createOrderCreatedEvent']>
  ): SdkAsyncResult<OrderShadowPublishOutcome> {
    const telemetry = createOrderEventTelemetryEmitter(
      this.options.onTelemetry,
      method,
      order.id,
      context.correlationId
    );

    try {
      if (!this.isEnabled()) {
        return sdkOk(this.skippedOutcome());
      }

      const envelopeResult = build();
      if (!envelopeResult.ok) {
        telemetry.shadowPublishFailed(envelopeResult.error.code);
        return sdkOk(this.failedOutcome(envelopeResult.error.message));
      }

      telemetry.shadowPublishStarted(envelopeResult.value.header.type);
      const publishResult = await this.eventPublisher.publish(envelopeResult.value);
      if (!publishResult.ok) {
        return sdkOk(
          this.failedOutcome(publishResult.error.message, envelopeResult.value.header.type)
        );
      }

      return sdkOk(
        this.successOutcome(
          envelopeResult.value.header.type,
          publishResult.value.eventId,
          publishResult.value.outboxId
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      telemetry.shadowPublishFailed('UNEXPECTED', undefined);
      return sdkOk(this.failedOutcome(message));
    }
  }

  publishOrderCreated(
    order: LegacyOrderDocument,
    context: OrderEventPublishContext
  ): SdkAsyncResult<OrderShadowPublishOutcome> {
    return this.safePublish('publishOrderCreated', order, context, () =>
      this.eventFactory.createOrderCreatedEvent(order, context)
    );
  }

  publishOrderUpdated(
    order: LegacyOrderDocument,
    context: OrderEventPublishContext,
    options: { previousStatus?: string; updatedFields?: readonly string[] } = {}
  ): SdkAsyncResult<OrderShadowPublishOutcome> {
    return this.safePublish('publishOrderUpdated', order, context, () =>
      this.eventFactory.createOrderUpdatedEvent(order, context, options)
    );
  }

  publishOrderCancelled(
    order: LegacyOrderDocument,
    context: OrderEventPublishContext,
    cancellationReason?: string
  ): SdkAsyncResult<OrderShadowPublishOutcome> {
    return this.safePublish('publishOrderCancelled', order, context, () =>
      this.eventFactory.createOrderCancelledEvent(order, context, cancellationReason)
    );
  }
}

export function createOrderShadowPublisher(options: OrderShadowPublisherOptions): OrderShadowPublisher {
  return new OrderShadowPublisher(options);
}

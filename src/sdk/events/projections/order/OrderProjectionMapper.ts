/**
 * Order read projection mapper (M6 PR-7).
 * Maps canonical order event envelopes to read model state transitions.
 */

import type { EventEnvelope } from '../../dto/EventEnvelope';
import type { SdkResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import type { OrderCreatedPayload } from '../../../../domain/events/orders/OrderCreatedEvent';
import type { OrderUpdatedPayload } from '../../../../domain/events/orders/OrderUpdatedEvent';
import type { OrderCancelledPayload } from '../../../../domain/events/orders/OrderCancelledEvent';
import { ORDER_EVENT_TYPES } from '../../../../domain/events/orders/OrderEventSchema';
import {
  buildOrderProjectionFromCreated,
  applyOrderProjectionUpdated,
  applyOrderProjectionCancelled,
  type OrderProjectionEventContext,
} from '../../../../domain/events/projections/order/OrderProjectionBuilders';
import type { OrderProjectionReadModel } from '../../../../domain/events/projections/order/OrderProjectionState';

export class OrderProjectionMapper {
  private buildContext<TPayload>(envelope: EventEnvelope<TPayload>): OrderProjectionEventContext {
    const branchId = envelope.metadata.custom?.branchId;
    return {
      eventId: envelope.header.eventId,
      eventType: envelope.header.type,
      schemaVersion: envelope.header.version,
      occurredAt: envelope.header.occurredAt,
      branchId,
    };
  }

  mapEvent(
    envelope: EventEnvelope,
    existing: OrderProjectionReadModel | null
  ): SdkResult<OrderProjectionReadModel> {
    const context = this.buildContext(envelope);
    const eventType = envelope.header.type;

    if (eventType === ORDER_EVENT_TYPES.CREATED) {
      const model = buildOrderProjectionFromCreated(
        envelope.payload as OrderCreatedPayload,
        context
      );
      return sdkOk(model);
    }

    if (!existing) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `No read model for order ${envelope.header.aggregateId}`,
        },
      };
    }

    if (eventType === ORDER_EVENT_TYPES.UPDATED) {
      return sdkOk(
        applyOrderProjectionUpdated(
          existing,
          envelope.payload as OrderUpdatedPayload,
          context
        )
      );
    }

    if (eventType === ORDER_EVENT_TYPES.CANCELLED) {
      return sdkOk(
        applyOrderProjectionCancelled(
          existing,
          envelope.payload as OrderCancelledPayload,
          context
        )
      );
    }

    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: `Unsupported event type: ${eventType}` },
    };
  }
}

export function createOrderProjectionMapper(): OrderProjectionMapper {
  return new OrderProjectionMapper();
}

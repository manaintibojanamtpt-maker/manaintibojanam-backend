/**
 * Order read projection validator (M6 PR-7).
 */

import type { EventEnvelope } from '../../dto/EventEnvelope';
import type { SdkResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import {
  validateOrderProjectionEventType,
  validateOrderProjectionReadModel,
  assertNoPiiInReadModel,
  canApplyUpdate,
  canApplyCancel,
} from '../../../../domain/events/projections/order/OrderProjectionValidation';
import type { OrderProjectionReadModel } from '../../../../domain/events/projections/order/OrderProjectionState';
import { ORDER_EVENT_TYPES } from '../../../../domain/events/orders/OrderEventSchema';
import { resolveOrderProjectionTransition } from '../../../../domain/events/projections/order/OrderProjectionBuilders';

export class OrderProjectionValidator {
  validateEnvelope<TPayload>(envelope: EventEnvelope<TPayload>): SdkResult<void> {
    const errors = validateOrderProjectionEventType(envelope.header.type);
    if (errors.length > 0) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: errors.join('; ') } };
    }
    if (!envelope.metadata.correlationId) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: 'correlationId is required' },
      };
    }
    return sdkOk(undefined);
  }

  validateReadModel(model: OrderProjectionReadModel): SdkResult<void> {
    const errors = [
      ...validateOrderProjectionReadModel(model),
      ...assertNoPiiInReadModel(model as unknown as Record<string, unknown>),
    ];
    if (errors.length > 0) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: errors.join('; ') } };
    }
    return sdkOk(undefined);
  }

  validateTransition(
    eventType: string,
    existing: OrderProjectionReadModel | null
  ): SdkResult<void> {
    const transition = resolveOrderProjectionTransition(eventType);
    if (transition === 'unsupported') {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: `Unsupported event: ${eventType}` },
      };
    }
    if (transition === 'create' && existing !== null) {
      return sdkOk(undefined);
    }
    if (transition === 'update' && !canApplyUpdate(existing)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Cannot apply order.updated.v1 without existing read model',
        },
      };
    }
    if (transition === 'cancel' && !canApplyCancel(existing)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Cannot apply order.cancelled.v1 without existing read model',
        },
      };
    }
    if (eventType === ORDER_EVENT_TYPES.CREATED && existing !== null) {
      return sdkOk(undefined);
    }
    return sdkOk(undefined);
  }
}

export function createOrderProjectionValidator(): OrderProjectionValidator {
  return new OrderProjectionValidator();
}

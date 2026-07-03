/** Order read projection builders (M6 PR-7). Pure domain — no SDK imports. */

import type { OrderCreatedPayload } from '../../orders/OrderCreatedEvent';
import type { OrderUpdatedPayload } from '../../orders/OrderUpdatedEvent';
import type { OrderCancelledPayload } from '../../orders/OrderCancelledEvent';
import { ORDER_EVENT_TYPES } from '../../orders/OrderEventSchema';
import {
  DEFAULT_ORDER_CURRENCY,
  ORDER_READ_PROJECTION_VERSION,
} from './OrderProjectionMetadata';
import type { OrderProjectionReadModel } from './OrderProjectionState';

export interface OrderProjectionEventContext {
  readonly eventId: string;
  readonly eventType: string;
  readonly schemaVersion: string;
  readonly occurredAt: string;
  readonly branchId?: string;
}

export function buildOrderProjectionFromCreated(
  payload: OrderCreatedPayload,
  context: OrderProjectionEventContext
): OrderProjectionReadModel {
  return {
    orderId: payload.orderId,
    tenantId: payload.tenantId,
    status: payload.status,
    branchId: context.branchId,
    customerId: payload.userId,
    totalAmount: payload.totalAmount,
    currency: DEFAULT_ORDER_CURRENCY,
    createdAt: context.occurredAt,
    updatedAt: context.occurredAt,
    version: context.schemaVersion,
    projectionVersion: ORDER_READ_PROJECTION_VERSION,
  };
}

export function applyOrderProjectionUpdated(
  current: OrderProjectionReadModel,
  payload: OrderUpdatedPayload,
  context: OrderProjectionEventContext
): OrderProjectionReadModel {
  return {
    ...current,
    status: payload.status,
    totalAmount: payload.totalAmount ?? current.totalAmount,
    branchId: context.branchId ?? current.branchId,
    updatedAt: context.occurredAt,
    version: context.schemaVersion,
    projectionVersion: ORDER_READ_PROJECTION_VERSION,
  };
}

export function applyOrderProjectionCancelled(
  current: OrderProjectionReadModel,
  payload: OrderCancelledPayload,
  context: OrderProjectionEventContext
): OrderProjectionReadModel {
  return {
    ...current,
    status: payload.status,
    totalAmount: payload.totalAmount ?? current.totalAmount,
    updatedAt: context.occurredAt,
    version: context.schemaVersion,
    projectionVersion: ORDER_READ_PROJECTION_VERSION,
  };
}

export function resolveOrderProjectionTransition(
  eventType: string
): 'create' | 'update' | 'cancel' | 'unsupported' {
  switch (eventType) {
    case ORDER_EVENT_TYPES.CREATED:
      return 'create';
    case ORDER_EVENT_TYPES.UPDATED:
      return 'update';
    case ORDER_EVENT_TYPES.CANCELLED:
      return 'cancel';
    default:
      return 'unsupported';
  }
}

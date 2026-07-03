/**
 * Order parity mapper (M6 PR-8).
 * Normalizes legacy documents and projection read models to canonical views.
 */

import type { LegacyOrderDocument } from '../../../../domain/events/orders/OrderEventMetadata';
import type { OrderProjectionReadModel } from '../../../../domain/events/projections/order/OrderProjectionState';
import {
  DEFAULT_PARITY_CURRENCY,
  normalizeParityLineItem,
  normalizeParityStatus,
  resolveParityTimestamp,
  type OrderCanonicalModel,
} from '../../../../domain/events/parity/order/OrderCanonicalModel';
import { ORDER_PAYLOAD_VERSION } from '../../../../domain/events/orders/OrderEventSchema';

export class OrderParityMapper {
  mapLegacy(order: LegacyOrderDocument, branchId?: string): OrderCanonicalModel {
    const createdAt = resolveParityTimestamp(order.createdAt, new Date(0).toISOString());
    const updatedAt = resolveParityTimestamp(order.updatedAt, createdAt);

    return {
      orderId: order.id,
      tenantId: order.tenantId,
      status: normalizeParityStatus(order.status),
      branchId,
      customerId: order.userId ?? undefined,
      currency: DEFAULT_PARITY_CURRENCY,
      totalAmount: order.totalAmount,
      createdAt,
      updatedAt,
      version: ORDER_PAYLOAD_VERSION,
      lineItems: (order.items ?? []).map(normalizeParityLineItem),
    };
  }

  mapProjection(model: OrderProjectionReadModel): OrderCanonicalModel {
    return {
      orderId: model.orderId,
      tenantId: model.tenantId,
      status: normalizeParityStatus(model.status),
      branchId: model.branchId,
      customerId: model.customerId,
      currency: model.currency,
      totalAmount: model.totalAmount,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      version: model.version,
      lineItems: [],
    };
  }
}

export function createOrderParityMapper(): OrderParityMapper {
  return new OrderParityMapper();
}

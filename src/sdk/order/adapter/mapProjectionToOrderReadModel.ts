/**
 * Maps projection read model to OrderReadModel (M6 PR-11).
 * Internal normalization only — does not change public DTO contract.
 */

import type { OrderId, TenantId, UserId, IsoDateTime } from '../../core/types';
import type { OrderReadModel, OrderStatus, PaymentMethod, PaymentStatus } from '../../orders/types';
import type { OrderProjectionReadModel } from '../../../domain/events/projections/order/OrderProjectionState';
import { normalizeOrderStatus, normalizePaymentMethod, normalizePaymentStatus } from '../../orders/mappers/mapOrderToReadModel';

export function mapProjectionToOrderReadModel(model: OrderProjectionReadModel): OrderReadModel {
  return {
    id: model.orderId as OrderId,
    tenantId: model.tenantId as TenantId,
    userId: model.customerId ? (model.customerId as UserId) : null,
    status: normalizeOrderStatus(model.status) as OrderStatus,
    paymentMethod: 'cod' as PaymentMethod,
    paymentStatus: 'pending' as PaymentStatus,
    items: [],
    subtotal: model.totalAmount ?? 0,
    totalAmount: model.totalAmount ?? 0,
    createdAt: model.createdAt as IsoDateTime,
    updatedAt: model.updatedAt as IsoDateTime,
  };
}

export function mapProjectionsToOrderReadModels(
  models: readonly OrderProjectionReadModel[]
): OrderReadModel[] {
  return models.map(mapProjectionToOrderReadModel);
}

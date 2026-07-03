/**
 * Order read adapter ports (M6 PR-11).
 * Additive contracts — does not modify frozen OrderSDK public API.
 */

import type { OrderId } from '../../core/types';
import type { SdkAsyncResult } from '../../core/result';
import type {
  OrderAccessContext,
  OrderListFilter,
  OrderReadModel,
  OrderTenantListFilter,
} from '../../orders/types';
import type { OrderProjectionReadModel } from '../../../domain/events/projections/order/OrderProjectionState';
import type { OrderAdapterDecision } from '../../../domain/order/adapter/OrderAdapterDecision';

export interface LegacyOrderRepositoryPort {
  getOrderById(orderId: OrderId, context?: OrderAccessContext): SdkAsyncResult<OrderReadModel>;
  listOrdersForUser(
    filter: OrderListFilter,
    context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]>;
  listOrdersForTenant(
    filter: OrderTenantListFilter,
    context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]>;
}

export interface ProjectionOrderRepositoryPort {
  getOrderById(orderId: OrderId): SdkAsyncResult<OrderProjectionReadModel | null>;
  listByTenant(tenantId: string, limit: number): SdkAsyncResult<OrderProjectionReadModel[]>;
  isAvailable(): SdkAsyncResult<boolean>;
}

export interface OrderAdapterReadinessPort {
  isParityReady(): SdkAsyncResult<boolean>;
  isOperationalGreen(): SdkAsyncResult<boolean>;
}

export interface OrderReadAdapterPort {
  getOrderById(orderId: OrderId, context?: OrderAccessContext): SdkAsyncResult<OrderReadModel>;
  listOrdersForUser(
    filter: OrderListFilter,
    context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]>;
  listOrdersForTenant(
    filter: OrderTenantListFilter,
    context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]>;
  resolveDecision(): SdkAsyncResult<OrderAdapterDecision>;
}

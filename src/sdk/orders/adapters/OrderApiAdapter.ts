/**
 * OrderSDK read-only implementation — delegates to src/services/api.ts via OrderApiPort.
 * M1 PR-3: strangler adapter (ADR-011). Not wired into UI until PR-4+.
 */

import type { OrderId } from '../../core/types';
import { sdkError, sdkFail, sdkFromError, sdkOk } from '../../core/resultHelpers';
import type { SdkAsyncResult } from '../../core/result';
import type { OrderSDK } from '../OrderSDK';
import type {
  GuestViewTokenInput,
  GuestViewTokenResult,
  OrderAccessContext,
  OrderListFilter,
  OrderReadModel,
  OrderTenantListFilter,
} from '../types';
import {
  mapOrderToReadModel,
  mapOrdersToReadModels,
} from '../mappers/mapOrderToReadModel';
import type { OrderApiPort } from './OrderApiPort';

export class OrderApiAdapter implements OrderSDK {
  constructor(private readonly port: OrderApiPort) {}

  async getOrderById(
    orderId: OrderId,
    _context?: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel> {
    try {
      const order = await this.port.fetchOrderByIdApi(orderId);
      if (!order) {
        return sdkFail(sdkError('NOT_FOUND', 'Order not found', { orderId }));
      }
      return sdkOk(mapOrderToReadModel(order));
    } catch (error) {
      return sdkFromError(error);
    }
  }

  async listOrdersForUser(
    filter: OrderListFilter,
    _context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]> {
    if (!filter.userId) {
      return sdkFail(
        sdkError('VALIDATION', 'userId is required to list orders for a user')
      );
    }

    try {
      let orders = mapOrdersToReadModels(await this.port.fetchOrders(filter.userId));

      if (filter.tenantId) {
        orders = orders.filter((order) => order.tenantId === filter.tenantId);
      }

      if (filter.limit !== undefined && filter.limit >= 0) {
        orders = orders.slice(0, filter.limit);
      }

      return sdkOk(orders);
    } catch (error) {
      return sdkFromError(error);
    }
  }

  async listOrdersForTenant(
    filter: OrderTenantListFilter,
    _context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]> {
    if (!filter.tenantId) {
      return sdkFail(sdkError('VALIDATION', 'tenantId is required to list orders for a tenant'));
    }

    if (!this.port.fetchOrdersByTenant) {
      return sdkFail(
        sdkError('NOT_CONFIGURED', 'fetchOrdersByTenant is not configured on OrderApiPort')
      );
    }

    try {
      let orders = mapOrdersToReadModels(await this.port.fetchOrdersByTenant(filter.tenantId));
      orders = orders.filter((order) => order.tenantId === filter.tenantId);
      orders = [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (filter.limit !== undefined && filter.limit >= 0) {
        orders = orders.slice(0, filter.limit);
      }

      return sdkOk(orders);
    } catch (error) {
      return sdkFromError(error);
    }
  }

  async requestGuestViewToken(
    orderId: OrderId,
    input: GuestViewTokenInput
  ): SdkAsyncResult<GuestViewTokenResult> {
    if (!input.phone && !input.phoneLast4) {
      return sdkFail(
        sdkError('VALIDATION', 'phone or phoneLast4 is required for guest view token')
      );
    }

    try {
      const result = await this.port.requestGuestViewToken(orderId, input);

      if (!result.success || !result.token || !result.expiresAt) {
        const message = result.error || 'Unable to verify order access';
        const code =
          message.toLowerCase().includes('not found') ||
          message.toLowerCase().includes('verify')
            ? 'NOT_FOUND'
            : 'UNAUTHORIZED';
        return sdkFail(sdkError(code, message, { orderId }));
      }

      return sdkOk({
        token: result.token,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      return sdkFromError(error);
    }
  }
}

export const createOrderApiAdapter = (port: OrderApiPort): OrderSDK =>
  new OrderApiAdapter(port);

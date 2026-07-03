/**
 * Projection order read adapter (M6 PR-11).
 */

import type { OrderId } from '../../core/types';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk, sdkFail, sdkError } from '../../core/resultHelpers';
import type {
  OrderAccessContext,
  OrderListFilter,
  OrderReadModel,
  OrderTenantListFilter,
} from '../../orders/types';
import type { ProjectionOrderRepositoryPort } from './orderAdapterPorts';
import {
  mapProjectionToOrderReadModel,
  mapProjectionsToOrderReadModels,
} from './mapProjectionToOrderReadModel';

export class ProjectionOrderAdapter {
  constructor(private readonly repository: ProjectionOrderRepositoryPort) {}

  async getOrderById(
    orderId: OrderId,
    _context?: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel> {
    const result = await this.repository.getOrderById(orderId);
    if (!result.ok) return result;
    if (!result.value) {
      return sdkFail(sdkError('NOT_FOUND', 'Order not found in projection', { orderId }));
    }
    return sdkOk(mapProjectionToOrderReadModel(result.value));
  }

  async listOrdersForUser(
    filter: OrderListFilter,
    _context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]> {
    if (!filter.tenantId) {
      return sdkFail(sdkError('VALIDATION', 'tenantId is required for projection list'));
    }
    const limit = filter.limit ?? 50;
    const listed = await this.repository.listByTenant(filter.tenantId, limit);
    if (!listed.ok) return listed;

    let orders = mapProjectionsToOrderReadModels(listed.value);
    if (filter.userId) {
      orders = orders.filter((order) => order.userId === filter.userId);
    }
    return sdkOk(orders);
  }

  async listOrdersForTenant(
    filter: OrderTenantListFilter,
    _context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]> {
    const limit = filter.limit ?? 50;
    const listed = await this.repository.listByTenant(filter.tenantId, limit);
    if (!listed.ok) return listed;
    return sdkOk(mapProjectionsToOrderReadModels(listed.value));
  }
}

export function createProjectionOrderAdapter(
  repository: ProjectionOrderRepositoryPort
): ProjectionOrderAdapter {
  return new ProjectionOrderAdapter(repository);
}

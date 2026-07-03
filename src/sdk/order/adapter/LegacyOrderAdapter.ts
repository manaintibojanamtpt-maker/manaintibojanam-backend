/**
 * Legacy order read adapter (M6 PR-11).
 */

import type { OrderId } from '../../core/types';
import type { SdkAsyncResult } from '../../core/result';
import type {
  OrderAccessContext,
  OrderListFilter,
  OrderReadModel,
  OrderTenantListFilter,
} from '../../orders/types';
import type { LegacyOrderRepositoryPort } from './orderAdapterPorts';

export class LegacyOrderAdapter {
  constructor(private readonly repository: LegacyOrderRepositoryPort) {}

  getOrderById(orderId: OrderId, context?: OrderAccessContext): SdkAsyncResult<OrderReadModel> {
    return this.repository.getOrderById(orderId, context);
  }

  listOrdersForUser(
    filter: OrderListFilter,
    context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]> {
    return this.repository.listOrdersForUser(filter, context);
  }

  listOrdersForTenant(
    filter: OrderTenantListFilter,
    context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]> {
    return this.repository.listOrdersForTenant(filter, context);
  }
}

export function createLegacyOrderAdapter(repository: LegacyOrderRepositoryPort): LegacyOrderAdapter {
  return new LegacyOrderAdapter(repository);
}

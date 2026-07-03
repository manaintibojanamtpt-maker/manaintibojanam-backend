/**
 * Order read projection repository — in-memory shadow store (M6 PR-7 test only).
 */

import type { OrderProjectionRepositoryPort } from '../../contracts/orderProjectionPorts';
import type { OrderProjectionReadModel } from '../../../../domain/events/projections/order/OrderProjectionState';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class OrderProjectionRepository implements OrderProjectionRepositoryPort {
  private readonly store = new Map<string, OrderProjectionReadModel>();

  save(model: OrderProjectionReadModel): SdkAsyncResult<void> {
    this.store.set(model.orderId, model);
    return Promise.resolve(sdkOk(undefined));
  }

  get(orderId: string): SdkAsyncResult<OrderProjectionReadModel | null> {
    return Promise.resolve(sdkOk(this.store.get(orderId) ?? null));
  }

  listByTenant(tenantId: string, limit: number): SdkAsyncResult<OrderProjectionReadModel[]> {
    const items = [...this.store.values()]
      .filter((m) => m.tenantId === tenantId)
      .slice(0, limit);
    return Promise.resolve(sdkOk(items));
  }

  count(): SdkAsyncResult<number> {
    return Promise.resolve(sdkOk(this.store.size));
  }
}

export function createOrderProjectionRepository(): OrderProjectionRepositoryPort {
  return new OrderProjectionRepository();
}

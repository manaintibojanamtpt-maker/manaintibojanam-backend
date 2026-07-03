/**
 * Order adapter validation (M6 PR-11).
 */

import type { OrderId } from '../../core/types';
import type { OrderListFilter, OrderTenantListFilter } from '../../orders/types';
import type { SdkResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { OrderAdapterReadinessContext } from '../../../domain/order/adapter/OrderAdapterDecision';

export class OrderAdapterValidation {
  validateOrderId(orderId: OrderId): SdkResult<void> {
    if (!orderId || !String(orderId).trim()) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: 'orderId is required' } };
    }
    return sdkOk(undefined);
  }

  validateUserListFilter(filter: OrderListFilter): SdkResult<void> {
    if (!filter.userId) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: 'userId is required to list orders for a user' },
      };
    }
    return sdkOk(undefined);
  }

  validateTenantListFilter(filter: OrderTenantListFilter): SdkResult<void> {
    if (!filter.tenantId) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: 'tenantId is required to list orders for a tenant' },
      };
    }
    return sdkOk(undefined);
  }

  validateReadinessContext(context: OrderAdapterReadinessContext): SdkResult<void> {
    if (context.adapterFlagEnabled && !context.projectionRepositoryAvailable) {
      return sdkOk(undefined);
    }
    return sdkOk(undefined);
  }
}

export function createOrderAdapterValidation(): OrderAdapterValidation {
  return new OrderAdapterValidation();
}

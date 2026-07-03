/**
 * BhojanOS SDK — Order module contract (interface only; implementation in M1 PR-3+).
 * ADR-011: first strangler vertical slice.
 */

import type { OrderId } from '../core/types';
import type { SdkAsyncResult } from '../core/result';
import type {
  GuestViewTokenInput,
  GuestViewTokenResult,
  OrderAccessContext,
  OrderListFilter,
  OrderReadModel,
  OrderTenantListFilter,
} from './types';

/**
 * Public order SDK surface for presentation layer.
 * No Firestore, REST, or Firebase types may appear in this contract.
 */
export interface OrderSDK {
  /**
   * Read a single order by id with optional access credentials.
   */
  getOrderById(orderId: OrderId, context?: OrderAccessContext): SdkAsyncResult<OrderReadModel>;

  /**
   * List orders for the authenticated user (self-scope).
   */
  listOrdersForUser(filter: OrderListFilter, context: OrderAccessContext): SdkAsyncResult<OrderReadModel[]>;

  /**
   * List orders for a tenant (owner scope).
   */
  listOrdersForTenant(
    filter: OrderTenantListFilter,
    context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]>;

  /**
   * Issue a guest view token after phone verification (ADR-012).
   */
  requestGuestViewToken(
    orderId: OrderId,
    input: GuestViewTokenInput
  ): SdkAsyncResult<GuestViewTokenResult>;
}

export interface OrderSDKFactory {
  create(): OrderSDK;
}

/**
 * Port for delegating OrderSDK read operations to src/services/api.ts (ADR-011 strangler).
 */

import type { GuestViewTokenInput } from '../types';
import type { ApiOrderRecord } from '../mappers/mapOrderToReadModel';

export interface ApiGuestViewTokenResult {
  success: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
}

export interface OrderApiPort {
  fetchOrderByIdApi(orderId: string): Promise<ApiOrderRecord | null>;
  fetchOrders(userId?: string): Promise<ApiOrderRecord[]>;
  fetchOrdersByTenant?(tenantId: string): Promise<ApiOrderRecord[]>;
  requestGuestViewToken(
    orderId: string,
    input: GuestViewTokenInput
  ): Promise<ApiGuestViewTokenResult>;
}

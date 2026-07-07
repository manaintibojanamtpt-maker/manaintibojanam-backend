import { ownerApiRequest } from './ownerProvisioning';
import type { ApiOrderRecord } from '../sdk/orders/mappers/mapOrderToReadModel';

export const OWNER_ORDERS_POLL_MS = 5_000;

export async function fetchOwnerOrdersFromApi(tenantId: string, limit = 50) {
  return ownerApiRequest<{
    success: boolean;
    tenantId: string;
    orders: ApiOrderRecord[];
    hasMore: boolean;
  }>('GET', `/api/owner/orders?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`);
}

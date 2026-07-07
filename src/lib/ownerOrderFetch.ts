/**
 * Tenant-scoped order fetch for owner SDK port — uses owner orders API.
 */

import { fetchOwnerOrdersFromApi } from './ownerOrdersApi';
import type { ApiOrderRecord } from '../sdk/orders/mappers/mapOrderToReadModel';

export const fetchOrdersByTenant = async (tenantId: string): Promise<ApiOrderRecord[]> => {
  const response = await fetchOwnerOrdersFromApi(tenantId, 200);
  return (response.orders ?? []) as ApiOrderRecord[];
};

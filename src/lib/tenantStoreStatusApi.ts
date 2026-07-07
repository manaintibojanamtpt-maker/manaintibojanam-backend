import { EnvironmentConfig } from '../config/environment';
import { fetchOwnerStorefront } from './ownerStorefrontApi';

export const TENANT_STORE_STATUS_POLL_MS = 30_000;
export const OWNER_STORE_STATUS_POLL_MS = 5_000;

export interface StoreOperationsPayload {
  storeOperations: Record<string, unknown>;
  acceptingOrders: boolean;
  storeStatus?: string;
}

interface PublicStoreOperationsResponse {
  ok: boolean;
  value?: StoreOperationsPayload & { slug?: string; tenantId?: string };
  error?: { message?: string };
}

export async function fetchPublicStoreOperations(slug: string): Promise<StoreOperationsPayload> {
  const apiBase = EnvironmentConfig.getApiUrl();
  const res = await fetch(
    `${apiBase}/api/marketplace/restaurants/${encodeURIComponent(slug)}/store-operations`,
  );
  const payload = (await res.json().catch(() => ({}))) as PublicStoreOperationsResponse;
  if (!res.ok || payload.ok === false || !payload.value) {
    throw new Error(payload.error?.message || 'Failed to load store status');
  }
  return {
    storeOperations: payload.value.storeOperations ?? {},
    acceptingOrders: payload.value.acceptingOrders === true,
    storeStatus: payload.value.storeStatus,
  };
}

export async function fetchOwnerStoreOperations(tenantId: string): Promise<StoreOperationsPayload> {
  const response = await fetchOwnerStorefront(tenantId);
  return {
    storeOperations: response.storeOperations ?? {},
    acceptingOrders: response.acceptingOrders === true,
    storeStatus: response.storeStatus,
  };
}

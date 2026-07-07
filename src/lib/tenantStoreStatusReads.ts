/**
 * Tenant store status reads — API polling (no client Firestore listeners).
 */

import {
  resolveStoreSettings,
  type ResolvedStoreSettings,
  type TenantStoreOperations,
} from './tenantStoreOperations';
import {
  fetchOwnerStoreOperations,
  fetchPublicStoreOperations,
  OWNER_STORE_STATUS_POLL_MS,
  TENANT_STORE_STATUS_POLL_MS,
} from './tenantStoreStatusApi';

export { OWNER_STORE_STATUS_POLL_MS, TENANT_STORE_STATUS_POLL_MS };

export const subscribeTenantStoreStatus = (
  tenantId: string | null,
  tenantSlug: string | null,
  useOwnerApi: boolean,
  callback: (settings: ResolvedStoreSettings | null) => void,
  onError?: (error: unknown) => void,
): (() => void) => {
  let cancelled = false;
  const pollMs = useOwnerApi ? OWNER_STORE_STATUS_POLL_MS : TENANT_STORE_STATUS_POLL_MS;

  const poll = async () => {
    try {
      let payload;
      if (useOwnerApi && tenantId) {
        payload = await fetchOwnerStoreOperations(tenantId);
      } else if (tenantSlug) {
        payload = await fetchPublicStoreOperations(tenantSlug);
      } else {
        return;
      }

      if (cancelled) return;
      callback(
        resolveStoreSettings({
          storeOperations: payload.storeOperations as TenantStoreOperations,
        }),
      );
    } catch (error) {
      onError?.(error);
    }
  };

  void poll();
  const timer = window.setInterval(() => {
    void poll();
  }, pollMs);

  return () => {
    cancelled = true;
    window.clearInterval(timer);
  };
};

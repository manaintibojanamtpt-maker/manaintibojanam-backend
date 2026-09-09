import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { resolvePreferredOwnerTenantId } from '../lib/ownerActiveTenant';
import { readCachedOwnerTenantIds } from '../lib/ownerRedirect';

/** Resolve tenant for owner portal pages — prefers TenantContext (synced with Firestore). */
export const useOwnerTenantId = (): string | null => {
  const { tenantId, loading } = useTenant();
  const { userProfile } = useAuth();

  const cachedIds = readCachedOwnerTenantIds();
  const effectiveOwned = (userProfile?.ownedTenantIds?.length ?? 0) > 0
    ? userProfile?.ownedTenantIds
    : cachedIds;

  const preferred = resolvePreferredOwnerTenantId(effectiveOwned, userProfile?.email);

  if (tenantId && preferred && tenantId === preferred) return tenantId;
  if (tenantId && preferred && tenantId !== preferred) return preferred;
  if (tenantId) return tenantId;
  if (loading) return null;
  return preferred;
};

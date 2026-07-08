import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { resolvePreferredOwnerTenantId } from '../lib/ownerActiveTenant';

/** Resolve tenant for owner portal pages — prefers TenantContext (synced with Firestore). */
export const useOwnerTenantId = (): string | null => {
  const { tenantId, loading } = useTenant();
  const { userProfile } = useAuth();

  const preferred = resolvePreferredOwnerTenantId(userProfile?.ownedTenantIds, userProfile?.email);

  if (tenantId && preferred && tenantId === preferred) return tenantId;
  if (tenantId && preferred && tenantId !== preferred) return preferred;
  if (tenantId) return tenantId;
  if (loading) return null;
  return preferred;
};

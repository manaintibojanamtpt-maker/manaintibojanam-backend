import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';

/** Resolve tenant for owner portal pages — prefers TenantContext (synced with Firestore). */
export const useOwnerTenantId = (): string | null => {
  const { tenantId, loading } = useTenant();
  const { userProfile } = useAuth();

  if (tenantId) return tenantId;
  if (loading) return null;
  return userProfile?.ownedTenantIds?.[0] ?? null;
};

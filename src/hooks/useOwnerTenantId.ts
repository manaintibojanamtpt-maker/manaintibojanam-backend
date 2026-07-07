import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { isFounderOwnerEmail } from '../config/founder';
import { FOUNDER_TENANT_ID } from '../config/founder';

/** Resolve tenant for owner portal pages — prefers TenantContext (synced with Firestore). */
export const useOwnerTenantId = (): string | null => {
  const { tenantId, loading } = useTenant();
  const { userProfile } = useAuth();

  const pickOwned = (): string | null => {
    const owned = userProfile?.ownedTenantIds ?? [];
    const email = userProfile?.email;
    const filtered = owned.filter(
      (id) => id && (id !== FOUNDER_TENANT_ID || isFounderOwnerEmail(email)),
    );
    return filtered[0] ?? null;
  };

  if (tenantId && tenantId !== FOUNDER_TENANT_ID) return tenantId;
  if (tenantId && isFounderOwnerEmail(userProfile?.email)) return tenantId;
  if (loading) return null;
  return pickOwned();
};

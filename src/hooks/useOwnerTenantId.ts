import { useAuth } from '../context/AuthContext';

/** Resolve tenant for owner portal pages — only the signed-in owner's kitchen. */
export const useOwnerTenantId = (): string | null => {
  const { userProfile } = useAuth();
  return userProfile?.ownedTenantIds?.[0] ?? null;
};

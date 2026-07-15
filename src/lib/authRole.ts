import { UserProfile } from '../types';
import { isFounderOwnerEmail } from '../config/founder';

/** Matches server requireSuperadmin — founder email is always platform super admin. */
export function hasSuperadminPortalAccess(
  email?: string | null,
  role?: string | null,
): boolean {
  return role === 'superadmin' || isFounderOwnerEmail(email);
}

/** Never downgrade superadmin; founder email always resolves to superadmin. */
export function resolveAuthRole(
  email?: string | null,
  role?: string | null,
  ownedTenantIds: string[] = [],
): UserProfile['role'] {
  if (isFounderOwnerEmail(email)) return 'superadmin';
  if (role === 'superadmin' || role === 'admin') return role;
  if (ownedTenantIds.length > 0 && (!role || role === 'user')) return 'owner';
  return (role as UserProfile['role']) || 'user';
}

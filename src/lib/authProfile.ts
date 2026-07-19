import type { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types';
import { FOUNDER_TENANT_ID, isFounderOwnerEmail } from '../config/founder';
import { resolveAuthRole } from './authRole';
import { cacheOwnerTenantIds, readCachedOwnerTenantIds } from './ownerRedirect';
import { syncOwnerTenantsViaApi } from './ownerProvisioning';

export { hasSuperadminPortalAccess, resolveAuthRole } from './authRole';

export function filterOwnedTenantIds(ids: string[], email?: string | null): string[] {
  return ids.filter(
    (id) => Boolean(id) && (id !== FOUNDER_TENANT_ID || isFounderOwnerEmail(email)),
  );
}

function resolveOwnerTenantIdsForProfile(user: FirebaseUser, ownedTenantIds: string[] = []): string[] {
  const fromInput = filterOwnedTenantIds(
    ownedTenantIds.length > 0 ? ownedTenantIds : readCachedOwnerTenantIds(),
    user.email,
  );
  if (fromInput.length > 0) return fromInput;
  if (isFounderOwnerEmail(user.email)) return [FOUNDER_TENANT_ID];
  return [];
}

/** Immediate profile from Firebase Auth + session cache — never blocks on Firestore. */
export function buildAuthFallbackProfile(user: FirebaseUser, ownedTenantIds: string[] = []): UserProfile {
  const owned = resolveOwnerTenantIdsForProfile(user, ownedTenantIds);
  if (owned.length > 0) cacheOwnerTenantIds(owned);
  return {
    userId: user.uid,
    email: user.email || '',
    name: user.displayName || '',
    phone: user.phoneNumber || '',
    address: '',
    role: resolveAuthRole(user.email, undefined, owned),
    ownedTenantIds: owned,
  } as UserProfile;
}

export function mergeAuthProfile(
  uid: string,
  data: Record<string, unknown>,
  prev: UserProfile | null,
): UserProfile {
  const fromSnap = { userId: uid, ...data } as UserProfile;
  const snapOwned = Array.isArray(fromSnap.ownedTenantIds)
    ? filterOwnedTenantIds(fromSnap.ownedTenantIds.filter(Boolean), fromSnap.email)
    : [];
  const prevOwned =
    prev?.userId === uid && Array.isArray(prev.ownedTenantIds)
      ? filterOwnedTenantIds(prev.ownedTenantIds.filter(Boolean), prev.email)
      : [];
  const ownedTenantIds = snapOwned.length > 0 ? snapOwned : prevOwned;
  const role = resolveAuthRole(fromSnap.email, fromSnap.role, ownedTenantIds);

  return { ...fromSnap, ownedTenantIds, role };
}

export function isOwnerPortalPath(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/owner');
}

export function isSuperAdminPortalPath(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/super-admin');
}

/** Server-side profile + tenant link — works when client Firestore is unavailable. */
export async function hydrateOwnerProfileViaApi(
  user: FirebaseUser,
  prev: UserProfile | null,
): Promise<UserProfile | null> {
  let owned: string[] = [];
  try {
    const synced = await syncOwnerTenantsViaApi();
    owned = filterOwnedTenantIds(synced, user.email);
  } catch (error) {
    console.warn('hydrateOwnerProfileViaApi failed:', error);
  }

  if (owned.length === 0) {
    owned = resolveOwnerTenantIdsForProfile(user);
  }
  if (owned.length === 0) return null;

  cacheOwnerTenantIds(owned);
  const base = prev ?? buildAuthFallbackProfile(user, owned);
  const role = resolveAuthRole(user.email, base.role, owned);
  return {
    ...base,
    ownedTenantIds: owned,
    role,
    email: user.email || base.email,
    name: base.name || user.displayName || '',
  } as UserProfile;
}

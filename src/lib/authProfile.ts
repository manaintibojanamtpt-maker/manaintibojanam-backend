import type { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types';
import { FOUNDER_TENANT_ID, isFounderOwnerEmail } from '../config/founder';
import { cacheOwnerTenantIds, readCachedOwnerTenantIds } from './ownerRedirect';
import { syncOwnerTenantsViaApi } from './ownerProvisioning';

export function filterOwnedTenantIds(ids: string[], email?: string | null): string[] {
  return ids.filter(
    (id) => Boolean(id) && (id !== FOUNDER_TENANT_ID || isFounderOwnerEmail(email)),
  );
}

/** Immediate profile from Firebase Auth + session cache — never blocks on Firestore. */
export function buildAuthFallbackProfile(user: FirebaseUser, ownedTenantIds: string[] = []): UserProfile {
  const owned = filterOwnedTenantIds(
    ownedTenantIds.length > 0 ? ownedTenantIds : readCachedOwnerTenantIds(),
    user.email,
  );
  return {
    userId: user.uid,
    email: user.email || '',
    name: user.displayName || '',
    phone: user.phoneNumber || '',
    address: '',
    role: owned.length > 0 ? 'owner' : 'user',
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
  const role =
    ownedTenantIds.length > 0 && (!fromSnap.role || fromSnap.role === 'user')
      ? 'owner'
      : fromSnap.role;

  return { ...fromSnap, ownedTenantIds, role };
}

export function isOwnerPortalPath(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/owner');
}

/** Server-side profile + tenant link — works when client Firestore is unavailable. */
export async function hydrateOwnerProfileViaApi(
  user: FirebaseUser,
  prev: UserProfile | null,
): Promise<UserProfile | null> {
  try {
    const synced = await syncOwnerTenantsViaApi();
    const owned = filterOwnedTenantIds(synced, user.email);
    if (owned.length === 0) return null;
    cacheOwnerTenantIds(owned);
    const base = prev ?? buildAuthFallbackProfile(user, owned);
    return {
      ...base,
      ownedTenantIds: owned,
      role: 'owner',
      email: user.email || base.email,
      name: base.name || user.displayName || '',
    } as UserProfile;
  } catch (error) {
    console.warn('hydrateOwnerProfileViaApi failed:', error);
    return null;
  }
}

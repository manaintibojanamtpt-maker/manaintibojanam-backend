import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { getDb } from './firebase-db';
import { syncOwnerTenantsViaApi } from './ownerProvisioning';
import { readCachedOwnerTenantIds, cacheOwnerTenantIds } from './ownerRedirect';

const FIRESTORE_READ_TIMEOUT_MS = 4_000;
const API_SYNC_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Read ownedTenantIds — cache-first for speed after login. */
async function readOwnedTenantIdsFromFirestore(uid: string): Promise<string[]> {
  const cached = readCachedOwnerTenantIds();
  if (cached.length > 0) return cached;

  const db = getDb();
  try {
    const userSnap = await withTimeout(
      getDoc(doc(db, 'users', uid)),
      FIRESTORE_READ_TIMEOUT_MS,
      null as any,
    );
    if (userSnap?.exists()) {
      const owned = userSnap.data()?.ownedTenantIds;
      if (Array.isArray(owned) && owned.length > 0) {
        const ids = owned.filter(Boolean);
        cacheOwnerTenantIds(ids);
        return ids;
      }
    }
  } catch (error) {
    console.warn('resolveOwnerTenantIds: user read failed', error);
  }

  try {
    const tenantSnap = await withTimeout(
      getDocs(query(collection(db, 'tenants'), where('ownerId', '==', uid))),
      FIRESTORE_READ_TIMEOUT_MS,
      null as any,
    );
    if (tenantSnap?.docs?.length) {
      const tenantIds = tenantSnap.docs.map((d) => d.id);
      cacheOwnerTenantIds(tenantIds);
      return tenantIds;
    }
  } catch (error) {
    console.warn('resolveOwnerTenantIds: ownerId lookup failed', error);
  }

  return [];
}

/** Ensure the signed-in user has ownedTenantIds populated (server sync when needed). */
export async function resolveOwnerTenantIds(uid: string, email?: string | null): Promise<string[]> {
  const fromUserDoc = await readOwnedTenantIdsFromFirestore(uid);
  if (fromUserDoc.length > 0) return fromUserDoc;

  try {
    const synced = await withTimeout(syncOwnerTenantsViaApi(), API_SYNC_TIMEOUT_MS, [] as string[]);
    if (synced.length > 0) {
      cacheOwnerTenantIds(synced);
      return synced;
    }
  } catch (error) {
    console.warn('resolveOwnerTenantIds: server sync failed', error);
  }

  if (email) {
    try {
      const db = getDb();
      const emailSnap = await withTimeout(
        getDocs(query(collection(db, 'tenants'), where('kyc.email', '==', email.trim().toLowerCase()))),
        FIRESTORE_READ_TIMEOUT_MS,
        null as any,
      );
      if (emailSnap?.docs?.length) {
        const ids = emailSnap.docs.map((d) => d.id);
        cacheOwnerTenantIds(ids);
        return ids;
      }
    } catch (error) {
      console.warn('resolveOwnerTenantIds: email lookup failed', error);
    }
  }

  return [];
}

export async function waitForOwnerTenantIds(
  uid: string,
  refreshProfile: () => Promise<void>,
  options?: { email?: string | null; maxAttempts?: number; knownIds?: string[] },
): Promise<string[]> {
  if (options?.knownIds && options.knownIds.length > 0) {
    await refreshProfile();
    return options.knownIds;
  }

  const maxAttempts = options?.maxAttempts ?? 8;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const ids = await resolveOwnerTenantIds(uid, options?.email);
    if (ids.length > 0) {
      cacheOwnerTenantIds(ids);
      await refreshProfile();
      return ids;
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 200));
    }
  }

  return [];
}

export function getOwnerDashboardPath(): string {
  return '/owner/dashboard';
}

/** Dashboard-first post-auth routing — setup steps live on dashboard + /owner/setup deep links. */
export async function getOwnerPostAuthPath(
  uid: string,
  email?: string | null,
  options?: { knownTenantIds?: string[] },
): Promise<string> {
  const ids =
    options?.knownTenantIds && options.knownTenantIds.length > 0
      ? options.knownTenantIds
      : await resolveOwnerTenantIds(uid, email);

  if (ids.length === 0) return '/owner/register';
  return getOwnerDashboardPath();
}

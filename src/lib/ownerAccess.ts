import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { getDb } from './firebase-db';
import { syncOwnerTenantsViaApi } from './ownerProvisioning';

/** Read ownedTenantIds — prefer cache for speed after login. */
async function readOwnedTenantIdsFromFirestore(uid: string): Promise<string[]> {
  const db = getDb();
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const owned = userSnap.data()?.ownedTenantIds;
      if (Array.isArray(owned) && owned.length > 0) {
        return owned.filter(Boolean);
      }
    }
  } catch (error) {
    console.warn('resolveOwnerTenantIds: user read failed', error);
  }

  try {
    const tenantSnap = await getDocs(query(collection(db, 'tenants'), where('ownerId', '==', uid)));
    const tenantIds = tenantSnap.docs.map((d) => d.id);
    if (tenantIds.length > 0) return tenantIds;
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
    const synced = await syncOwnerTenantsViaApi();
    if (synced.length > 0) return synced;
  } catch (error) {
    console.warn('resolveOwnerTenantIds: server sync failed', error);
  }

  if (email) {
    try {
      const db = getDb();
      const emailSnap = await getDocs(
        query(collection(db, 'tenants'), where('kyc.email', '==', email.trim().toLowerCase())),
      );
      if (emailSnap.docs.length > 0) {
        try {
          const synced = await syncOwnerTenantsViaApi();
          if (synced.length > 0) return synced;
        } catch (retryErr) {
          console.warn('resolveOwnerTenantIds: retry sync failed', retryErr);
        }
        return emailSnap.docs.map((d) => d.id);
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

import { collection, doc, getDoc, getDocFromServer, getDocs, query, where } from 'firebase/firestore';
import { getDb } from './firebase-db';
import { syncOwnerTenantsViaApi } from './ownerProvisioning';

/** Read ownedTenantIds from Firestore (no client writes — rules block role/ownedTenantIds updates). */
async function readOwnedTenantIdsFromFirestore(uid: string): Promise<string[]> {
  const db = getDb();
  try {
    const userSnap = await getDocFromServer(doc(db, 'users', uid)).catch(() => getDoc(doc(db, 'users', uid)));
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

  // Fallback: email match may exist on tenant but ownerId not linked yet
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
  options?: { email?: string | null; maxAttempts?: number },
): Promise<string[]> {
  const maxAttempts = options?.maxAttempts ?? 24;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const ids = await resolveOwnerTenantIds(uid, options?.email);
    if (ids.length > 0) {
      await refreshProfile();
      return ids;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }

  return [];
}

export function getOwnerDashboardPath(): string {
  return '/owner/dashboard';
}

type TenantOnboardingSnapshot = {
  onboardingStatus?: { isComplete?: boolean; migrated?: boolean; currentStep?: number };
  storeStatus?: string;
  sandboxMode?: boolean;
};

/** Route new/incomplete owners to the guided setup wizard. */
export async function getOwnerPostAuthPath(
  uid: string,
  email?: string | null,
): Promise<string> {
  const ids = await resolveOwnerTenantIds(uid, email);
  if (ids.length === 0) return '/owner/register';

  try {
    const tenantSnap = await getDoc(doc(getDb(), 'tenants', ids[0]));
    const tenant = tenantSnap.data() as TenantOnboardingSnapshot | undefined;
    if (!tenant) return getOwnerDashboardPath();

    const onboarding = tenant.onboardingStatus;
    const isLive =
      tenant.storeStatus === 'published' ||
      tenant.storeStatus === 'active' ||
      !!tenant.sandboxMode;

    if (onboarding?.migrated || onboarding?.isComplete || isLive) {
      return getOwnerDashboardPath();
    }
    return '/owner/setup';
  } catch {
    return getOwnerDashboardPath();
  }
}

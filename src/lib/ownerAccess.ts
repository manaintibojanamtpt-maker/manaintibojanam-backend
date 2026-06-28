import { collection, doc, getDoc, getDocFromServer, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { getDb } from './firebase-db';

/** Ensure the signed-in user has ownedTenantIds populated from their tenant docs. */
export async function resolveOwnerTenantIds(uid: string, email?: string | null): Promise<string[]> {
  const db = getDb();
  const userRef = doc(db, 'users', uid);

  try {
    const userSnap = await getDocFromServer(userRef).catch(() => getDoc(userRef));
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
    if (tenantIds.length > 0) {
      await setDoc(
        userRef,
        {
          ownedTenantIds: tenantIds,
          role: 'owner',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return tenantIds;
    }
  } catch (error) {
    console.warn('resolveOwnerTenantIds: ownerId lookup failed', error);
  }

  if (email) {
    try {
      const emailSnap = await getDocs(query(collection(db, 'tenants'), where('kyc.email', '==', email)));
      const tenantIds = emailSnap.docs.map((d) => d.id);
      if (tenantIds.length > 0) {
        await Promise.all(
          tenantIds.map((tenantId) =>
            setDoc(doc(db, 'tenants', tenantId), { ownerId: uid }, { merge: true }),
          ),
        );
        await setDoc(
          userRef,
          {
            ownedTenantIds: tenantIds,
            role: 'owner',
            email,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        return tenantIds;
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

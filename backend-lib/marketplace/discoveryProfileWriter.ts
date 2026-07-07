import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  projectTenantDiscoveryProfile,
  type TenantDiscoveryProfile,
} from './tenantDiscoveryProfile.js';
import { countTenantMenuItems } from './menuTenantQuery.js';

const COLLECTION = 'discovery_profiles';

/** Firestore rejects undefined field values — strip before writes. */
function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export { countTenantMenuItems } from './menuTenantQuery.js';

export async function writeTenantDiscoveryProfile(
  db: Firestore,
  tenantId: string,
  raw: Record<string, unknown>,
  menuItemCount?: number,
): Promise<TenantDiscoveryProfile> {
  const slug = typeof raw.slug === 'string' ? raw.slug : undefined;
  const count = menuItemCount ?? (await countTenantMenuItems(db, tenantId, slug));
  const profile = projectTenantDiscoveryProfile({ tenantId, raw, menuItemCount: count });
  await db.collection(COLLECTION).doc(tenantId).set(sanitizeForFirestore(profile), { merge: true });
  return profile;
}

export async function removeTenantDiscoveryProfile(db: Firestore, tenantId: string): Promise<void> {
  await db.collection(COLLECTION).doc(tenantId).delete();
}

export async function loadVisibleDiscoveryProfiles(
  db: Firestore,
): Promise<Array<{ tenantId: string; profile: TenantDiscoveryProfile; raw?: Record<string, unknown> }>> {
  const snapshot = await db.collection(COLLECTION).where('visible', '==', true).get();
  const results: Array<{ tenantId: string; profile: TenantDiscoveryProfile; raw?: Record<string, unknown> }> = [];

  for (const doc of snapshot.docs) {
    const profile = doc.data() as TenantDiscoveryProfile;
    if (!profile.visible) continue;
    results.push({ tenantId: doc.id, profile });
  }

  return results;
}

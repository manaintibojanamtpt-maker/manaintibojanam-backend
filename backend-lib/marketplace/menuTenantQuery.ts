import type { Firestore, QuerySnapshot } from 'firebase-admin/firestore';

/** Menu items may use tenant doc id or slug in tenantId field — match both. */
export async function queryMenuForTenant(
  db: Firestore,
  tenantId: string,
  tenantSlug?: string,
): Promise<QuerySnapshot> {
  const keys = [...new Set([tenantId, tenantSlug].filter((k): k is string => Boolean(k)))];
  if (keys.length === 0) {
    return db.collection('menu').where('tenantId', '==', '__none__').get();
  }
  if (keys.length === 1) {
    return db.collection('menu').where('tenantId', '==', keys[0]).get();
  }
  return db.collection('menu').where('tenantId', 'in', keys.slice(0, 10)).get();
}

export async function countTenantMenuItems(
  db: Firestore,
  tenantId: string,
  tenantSlug?: string,
): Promise<number> {
  const snapshot = await queryMenuForTenant(db, tenantId, tenantSlug);
  return snapshot.size;
}

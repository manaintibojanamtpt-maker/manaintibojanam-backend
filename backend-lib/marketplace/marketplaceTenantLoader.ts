import type { Firestore } from 'firebase-admin/firestore';
import { parseFirestoreTenant } from './projectFoodMenuV1.js';

export async function loadTenantDocBySlug(db: Firestore, slug: string) {
  const direct = await db.collection('tenants').doc(slug).get();
  if (direct.exists) return direct;

  const query = await db.collection('tenants').where('slug', '==', slug).limit(1).get();
  if (query.empty) return null;
  return query.docs[0];
}

export async function loadTenantBySlug(db: Firestore, slug: string) {
  const doc = await loadTenantDocBySlug(db, slug);
  if (!doc) return null;
  return {
    tenant: parseFirestoreTenant(doc.id, doc.data() as Record<string, unknown>),
    raw: doc.data() as Record<string, unknown>,
  };
}

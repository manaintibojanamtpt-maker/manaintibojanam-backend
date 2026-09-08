import type { Firestore } from 'firebase-admin/firestore';
import { parseFirestoreTenant } from './projectFoodMenuV1.js';

export async function loadTenantDocBySlug(db: Firestore, slug: string) {
  const trimmed = String(slug || '').trim();
  if (!trimmed) return null;

  const direct = await db.collection('tenants').doc(trimmed).get();
  if (direct.exists) return direct;

  const stripped = trimmed.replace(/^obr_/, '');
  if (stripped !== trimmed) {
    const strippedDoc = await db.collection('tenants').doc(stripped).get();
    if (strippedDoc.exists) return strippedDoc;
  }

  const query = await db.collection('tenants').where('slug', '==', stripped).limit(1).get();
  if (!query.empty) return query.docs[0];

  const origQuery = await db.collection('tenants').where('slug', '==', trimmed).limit(1).get();
  if (!origQuery.empty) return origQuery.docs[0];

  const mpQuery = await db.collection('tenants').where('marketplace.publicRestaurantId', '==', trimmed).limit(1).get();
  if (!mpQuery.empty) return mpQuery.docs[0];

  return null;
}

export async function loadTenantBySlug(db: Firestore, slug: string) {
  const doc = await loadTenantDocBySlug(db, slug);
  if (!doc) return null;
  return {
    tenant: parseFirestoreTenant(doc.id, doc.data() as Record<string, unknown>),
    raw: doc.data() as Record<string, unknown>,
  };
}

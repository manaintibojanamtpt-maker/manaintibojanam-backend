import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { encodeGeohashPoint, toGeohashPrefix } from '../shared/serverBundleHelpers.js';
import { isMarketplaceVisibleTenant } from './marketplaceVisibility.js';

const GEO_INDEX_PREFIXES = [6, 5] as const;

function resolveTenantGeohash(raw: Record<string, unknown>): string | null {
  const location = raw.location as Record<string, unknown> | undefined;
  if (!location) return null;

  const stored = typeof location.geohash === 'string' ? location.geohash.trim().toLowerCase() : '';
  if (stored) return stored;

  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return null;
  }

  const encoded = encodeGeohashPoint({ lat, lng }, 7);
  return encoded.ok ? encoded.value.toLowerCase() : null;
}

export async function removeTenantGeoIndexEntries(db: Firestore, tenantId: string): Promise<void> {
  const snapshot = await db.collection('geoIndex').where('tenantId', '==', tenantId).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

export async function syncTenantGeoIndexEntry(
  db: Firestore,
  fieldValue: typeof FieldValue,
  tenantId: string,
  raw: Record<string, unknown>,
): Promise<void> {
  if (!isMarketplaceVisibleTenant(raw)) {
    await removeTenantGeoIndexEntries(db, tenantId);
    return;
  }

  const geohash = resolveTenantGeohash(raw);
  if (!geohash) {
    await removeTenantGeoIndexEntries(db, tenantId);
    return;
  }

  const location = raw.location as Record<string, unknown>;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  const slug = typeof raw.slug === 'string' ? raw.slug : tenantId;
  const name = typeof raw.name === 'string' ? raw.name : slug;

  const prefixes = GEO_INDEX_PREFIXES
    .map((precision) => toGeohashPrefix(geohash, precision))
    .filter((prefix): prefix is string => Boolean(prefix));

  const batch = db.batch();
  for (const prefix of prefixes) {
    const docId = `${prefix}_${tenantId}`;
    batch.set(
      db.collection('geoIndex').doc(docId),
      {
        geohashPrefix: prefix,
        geohash,
        branchId: tenantId,
        tenantId,
        status: 'active',
        name,
        slug,
        coordinates: { lat, lng },
        updatedAt: fieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();
}

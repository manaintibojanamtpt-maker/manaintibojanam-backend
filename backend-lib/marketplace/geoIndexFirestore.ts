import type { Firestore } from 'firebase-admin/firestore';
import {
  buildExpansionPrefixPlan,
  buildGeoIndexPrefixPlan,
  dedupeGeoIndexEntries,
  encodeGeohashPoint,
  extractTenantIdsFromGeoIndex,
  type GeoIndexReadRecord,
} from '../shared/serverBundleHelpers.js';

export function encodeCustomerGeohash(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const encoded = encodeGeohashPoint({ lat, lng }, 7);
  return encoded.ok ? encoded.value.toLowerCase() : null;
}

export function buildCustomerGeoIndexPrefixes(lat: number, lng: number): readonly string[] {
  const geohash = encodeCustomerGeohash(lat, lng);
  if (!geohash) return [];
  const primary = buildGeoIndexPrefixPlan(geohash);
  const expansion = buildExpansionPrefixPlan(geohash).filter((prefix) => !primary.includes(prefix));
  return [...primary, ...expansion];
}

function parseGeoIndexDoc(id: string, raw: Record<string, unknown>): GeoIndexReadRecord | null {
  const tenantId = typeof raw.tenantId === 'string' ? raw.tenantId.trim() : '';
  const branchId = typeof raw.branchId === 'string' ? raw.branchId.trim() : tenantId;
  const geohashPrefix = typeof raw.geohashPrefix === 'string' ? raw.geohashPrefix.trim() : '';
  const geohash = typeof raw.geohash === 'string' ? raw.geohash.trim() : '';
  if (!tenantId || !geohashPrefix || !geohash) return null;
  return {
    id,
    tenantId,
    branchId,
    geohashPrefix,
    geohash,
    status: typeof raw.status === 'string' ? raw.status : 'active',
    name: typeof raw.name === 'string' ? raw.name : undefined,
    slug: typeof raw.slug === 'string' ? raw.slug : undefined,
  };
}

export async function queryGeoIndexByPrefixes(
  db: Firestore,
  prefixes: readonly string[],
): Promise<GeoIndexReadRecord[]> {
  if (prefixes.length === 0) return [];

  const snapshots = await Promise.all(
    prefixes.map((prefix) =>
      db
        .collection('geoIndex')
        .where('geohashPrefix', '==', prefix)
        .where('status', '==', 'active')
        .limit(50)
        .get(),
    ),
  );

  const matches: GeoIndexReadRecord[] = [];
  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      const parsed = parseGeoIndexDoc(doc.id, doc.data() as Record<string, unknown>);
      if (parsed) matches.push(parsed);
    }
  }

  return dedupeGeoIndexEntries(matches);
}

export async function resolveNearbyTenantIds(
  db: Firestore,
  coords: { lat: number; lng: number },
): Promise<{ tenantIds: string[]; prefixesQueried: string[] }> {
  const prefixesQueried = [...buildCustomerGeoIndexPrefixes(coords.lat, coords.lng)];
  const entries = await queryGeoIndexByPrefixes(db, prefixesQueried);
  return {
    tenantIds: extractTenantIdsFromGeoIndex(entries),
    prefixesQueried,
  };
}

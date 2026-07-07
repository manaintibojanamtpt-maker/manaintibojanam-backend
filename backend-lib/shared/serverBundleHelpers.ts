type GeoPoint = { lat: number; lng: number };

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohashPoint(point: GeoPoint, precision = 7): { ok: true; value: string } | { ok: false } {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return { ok: false };
  if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) return { ok: false };

  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (lngMin + lngMax) / 2;
      if (point.lng >= mid) {
        ch = ch | (1 << (4 - bit));
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (point.lat >= mid) {
        ch = ch | (1 << (4 - bit));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    isLng = !isLng;
    bit += 1;
    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return { ok: true, value: hash };
}

export const DEFAULT_GEOINDEX_PRECISION = 6;

export function toGeohashPrefix(geohash: string, precision: number): string | null {
  const normalized = geohash.trim().toLowerCase();
  if (!normalized || precision <= 0 || normalized.length < precision) return null;
  return normalized.slice(0, precision);
}

function uniquePrefixes(prefixes: readonly string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const prefix of prefixes) {
    if (!prefix || seen.has(prefix)) continue;
    seen.add(prefix);
    ordered.push(prefix);
  }
  return ordered;
}

export function buildGeoIndexPrefixPlan(geohash: string, precision = DEFAULT_GEOINDEX_PRECISION): readonly string[] {
  const prefixes: string[] = [];
  const primary = toGeohashPrefix(geohash, precision);
  if (primary) prefixes.push(primary);
  const expanded = toGeohashPrefix(geohash, 5);
  if (expanded) prefixes.push(expanded);
  return uniquePrefixes(prefixes);
}

export function buildExpansionPrefixPlan(geohash: string, precision = DEFAULT_GEOINDEX_PRECISION): readonly string[] {
  const prefixes: string[] = [];
  const expanded = toGeohashPrefix(geohash, 5);
  if (expanded && 5 < precision) prefixes.push(expanded);
  return uniquePrefixes(prefixes);
}

export interface GeoIndexReadRecord {
  readonly id?: string;
  readonly geohashPrefix: string;
  readonly geohash: string;
  readonly branchId: string;
  readonly tenantId: string;
  readonly status?: string;
  readonly name?: string;
  readonly slug?: string;
}

export function extractTenantIdsFromGeoIndex(entries: readonly GeoIndexReadRecord[]): string[] {
  const seen = new Set<string>();
  const tenantIds: string[] = [];
  for (const entry of entries) {
    if (String(entry.status ?? 'active').toLowerCase() !== 'active') continue;
    const tenantId = entry.tenantId?.trim();
    if (!tenantId || seen.has(tenantId)) continue;
    seen.add(tenantId);
    tenantIds.push(tenantId);
  }
  return tenantIds.sort((a, b) => a.localeCompare(b));
}

export function dedupeGeoIndexEntries(entries: readonly GeoIndexReadRecord[]): GeoIndexReadRecord[] {
  const seen = new Set<string>();
  const deduped: GeoIndexReadRecord[] = [];
  for (const entry of entries) {
    const key = `${entry.tenantId}:${entry.branchId}:${entry.geohashPrefix}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

type SearchMatchType = 'exact' | 'prefix' | 'contains' | 'none';

const SIGNALS: Record<SearchMatchType, number> = {
  exact: 1,
  prefix: 0.85,
  contains: 0.65,
  none: 0,
};

export function classifyTextMatch(
  query: string,
  fieldValue: string,
  field: string,
): { matchType: SearchMatchType; signal: number; field: string } {
  const normalizedQuery = normalizeForMatch(query);
  const normalizedField = normalizeForMatch(fieldValue);
  if (!normalizedQuery || !normalizedField) {
    return { matchType: 'none', signal: SIGNALS.none, field };
  }
  if (normalizedField === normalizedQuery) {
    return { matchType: 'exact', signal: SIGNALS.exact, field };
  }
  if (normalizedField.startsWith(normalizedQuery)) {
    return { matchType: 'prefix', signal: SIGNALS.prefix, field };
  }
  if (normalizedField.includes(normalizedQuery)) {
    return { matchType: 'contains', signal: SIGNALS.contains, field };
  }
  return { matchType: 'none', signal: SIGNALS.none, field };
}

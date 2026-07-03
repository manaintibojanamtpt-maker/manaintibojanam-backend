/**
 * DiscoverySDK — geohash prefix resolution (M3 PR-7).
 */

import { encodeGeohashPoint } from '../../location/adapters/localGeoComputation';
import type { DiscoveryQuery } from '../dto/candidates';

export const DEFAULT_GEOINDEX_PRECISION = 6;

export function toGeohashPrefix(geohash: string, precision: number): string | null {
  const normalized = geohash.trim().toLowerCase();
  if (!normalized || precision <= 0 || normalized.length < precision) {
    return null;
  }
  return normalized.slice(0, precision);
}

export function resolveCustomerGeohash(query: DiscoveryQuery): string | null {
  const stored = query.customerGeohash?.trim();
  if (stored) {
    return stored.toLowerCase();
  }

  const encoded = encodeGeohashPoint(query.customerPoint, 7);
  if (encoded.ok === false) {
    return null;
  }

  return encoded.value.toLowerCase();
}

export function resolvePrimaryGeohashPrefix(
  query: DiscoveryQuery,
  precision: number = DEFAULT_GEOINDEX_PRECISION
): { readonly geohash: string; readonly prefix: string } | null {
  const geohash = resolveCustomerGeohash(query);
  if (!geohash) {
    return null;
  }

  const prefix = toGeohashPrefix(geohash, precision);
  if (!prefix) {
    return null;
  }

  return { geohash, prefix };
}

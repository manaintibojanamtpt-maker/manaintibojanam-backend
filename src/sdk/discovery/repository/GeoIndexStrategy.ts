/**
 * DiscoverySDK — geoIndex prefix query strategy (M3 PR-7).
 */

import { DEFAULT_GEOINDEX_PRECISION, toGeohashPrefix } from './GeoHashPrefixResolver';

export interface GeoIndexStrategyOptions {
  /** Primary prefix precision — default 6 (~1.2km cell). */
  readonly precision?: number;
  /** Additional precisions queried when primary returns no matches. */
  readonly expansionPrecisions?: readonly number[];
  /** Reserved for neighbor-cell expansion (future). */
  readonly includeNeighborCells?: boolean;
}

export const DEFAULT_GEOINDEX_STRATEGY: GeoIndexStrategyOptions = {
  precision: DEFAULT_GEOINDEX_PRECISION,
  expansionPrecisions: [5],
  includeNeighborCells: false,
};

const uniquePrefixes = (prefixes: readonly string[]): string[] => {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const prefix of prefixes) {
    if (!prefix || seen.has(prefix)) {
      continue;
    }
    seen.add(prefix);
    ordered.push(prefix);
  }

  return ordered;
};

export function buildGeoIndexPrefixPlan(
  geohash: string,
  options: GeoIndexStrategyOptions = DEFAULT_GEOINDEX_STRATEGY
): readonly string[] {
  const precision = options.precision ?? DEFAULT_GEOINDEX_PRECISION;
  const prefixes: string[] = [];

  const primary = toGeohashPrefix(geohash, precision);
  if (primary) {
    prefixes.push(primary);
  }

  for (const expansionPrecision of options.expansionPrecisions ?? []) {
    const expanded = toGeohashPrefix(geohash, expansionPrecision);
    if (expanded) {
      prefixes.push(expanded);
    }
  }

  return uniquePrefixes(prefixes);
}

export function buildExpansionPrefixPlan(
  geohash: string,
  options: GeoIndexStrategyOptions = DEFAULT_GEOINDEX_STRATEGY
): readonly string[] {
  const precision = options.precision ?? DEFAULT_GEOINDEX_PRECISION;
  const prefixes: string[] = [];

  for (const expansionPrecision of options.expansionPrecisions ?? []) {
    if (expansionPrecision >= precision) {
      continue;
    }
    const expanded = toGeohashPrefix(geohash, expansionPrecision);
    if (expanded) {
      prefixes.push(expanded);
    }
  }

  return uniquePrefixes(prefixes);
}

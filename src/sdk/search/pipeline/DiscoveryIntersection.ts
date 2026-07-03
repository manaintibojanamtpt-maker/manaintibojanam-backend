/**
 * SearchSDK — intersect repository hits with Discovery results (M4 PR-6).
 * Preserves Discovery ranking order — Search does not re-rank.
 */

import type { DiscoveryResult } from '../../discovery/dto/results';
import type { SearchIndexHit } from '../dto';
import type { SearchEnrichedCandidate } from './types';

export function intersectSearchHitsWithDiscovery(
  hits: readonly SearchIndexHit[],
  discovery: DiscoveryResult
): SearchEnrichedCandidate[] {
  if (hits.length === 0 || discovery.restaurants.length === 0) {
    return [];
  }

  const hitByTenant = new Map<string, SearchIndexHit>();
  for (const hit of hits) {
    const tenantId = String(hit.tenantId);
    const existing = hitByTenant.get(tenantId);
    if (!existing || hit.score > existing.score) {
      hitByTenant.set(tenantId, hit);
    }
  }

  const pairs: SearchEnrichedCandidate[] = [];
  for (const restaurant of discovery.restaurants) {
    const hit = hitByTenant.get(String(restaurant.tenantId));
    if (hit) {
      pairs.push({ hit, restaurant });
    }
  }

  return pairs;
}

export function countIntersectingTenants(
  hits: readonly SearchIndexHit[],
  discovery: DiscoveryResult
): number {
  const hitTenants = new Set(hits.map((hit) => String(hit.tenantId)));
  return discovery.restaurants.filter((restaurant) => hitTenants.has(String(restaurant.tenantId)))
    .length;
}

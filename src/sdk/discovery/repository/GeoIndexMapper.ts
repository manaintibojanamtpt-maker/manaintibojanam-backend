/**
 * DiscoverySDK — geoIndex → tenant ID mapping (M3 PR-7).
 */

import type { DiscoveryCandidate } from '../dto/candidates';
import type { GeoIndexReadRecord } from './GeoIndexPort';
import type { TenantReadRecord } from './ports/TenantRepositoryPort';
import { mapTenantsToDiscoveryCandidates } from './mappers/DiscoveryCandidateMapper';

const isActiveGeoIndexEntry = (entry: GeoIndexReadRecord): boolean =>
  String(entry.status ?? 'active').toLowerCase() === 'active';

export function extractTenantIdsFromGeoIndex(
  entries: readonly GeoIndexReadRecord[]
): string[] {
  const seen = new Set<string>();
  const tenantIds: string[] = [];

  for (const entry of entries) {
    if (!isActiveGeoIndexEntry(entry)) {
      continue;
    }

    const tenantId = entry.tenantId?.trim();
    if (!tenantId || seen.has(tenantId)) {
      continue;
    }

    seen.add(tenantId);
    tenantIds.push(tenantId);
  }

  return tenantIds.sort((left, right) => left.localeCompare(right));
}

export function dedupeGeoIndexEntries(
  entries: readonly GeoIndexReadRecord[]
): GeoIndexReadRecord[] {
  const seen = new Set<string>();
  const deduped: GeoIndexReadRecord[] = [];

  for (const entry of entries) {
    const key = `${entry.tenantId}:${entry.branchId}:${entry.geohashPrefix}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}

export function mapTenantsToStableDiscoveryCandidates(
  tenants: readonly TenantReadRecord[]
): DiscoveryCandidate[] {
  const candidates = mapTenantsToDiscoveryCandidates(tenants);
  return [...candidates].sort((left, right) =>
    String(left.tenantId).localeCompare(String(right.tenantId))
  );
}

export function orderTenantsByIds(
  tenants: readonly TenantReadRecord[],
  tenantIds: readonly string[]
): TenantReadRecord[] {
  const byId = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  return tenantIds
    .map((tenantId) => byId.get(tenantId))
    .filter((tenant): tenant is TenantReadRecord => tenant !== undefined);
}

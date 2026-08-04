/**
 * DiscoverySDK — tenant → DiscoveryCandidate mapper (M3 PR-3).
 * Tenant-as-branch: branchId === tenantId.
 */

import { encodeGeohashPoint } from '../../../location/adapters/localGeoComputation';
import type { BranchId, Geohash } from '../../types/branded';
import type { DiscoveryCandidate } from '../../dto/candidates';
import type { TenantReadRecord } from '../ports/TenantRepositoryPort';
import type { TenantId } from '../../../core/types';

const isActiveTenant = (tenant: TenantReadRecord): boolean =>
  String(tenant.status ?? '').toLowerCase() === 'active';

const resolveGeohash = (tenant: TenantReadRecord): Geohash | null => {
  const stored = tenant.location?.geohash?.trim();
  if (stored) {
    return stored as Geohash;
  }

  const lat = tenant.location?.lat;
  const lng = tenant.location?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    return null;
  }

  const encoded = encodeGeohashPoint({ lat, lng }, 7);
  if (encoded.ok === false) {
    return null;
  }
  return encoded.value as Geohash;
};

export function mapTenantToDiscoveryCandidate(tenant: TenantReadRecord): DiscoveryCandidate | null {
  if (!isActiveTenant(tenant)) {
    return null;
  }

  const lat = tenant.location?.lat;
  const lng = tenant.location?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    return null;
  }

  const geohash = resolveGeohash(tenant);
  if (!geohash) {
    return null;
  }

  const tenantId = tenant.id as TenantId;
  const slug = tenant.slug?.trim() || tenant.id;
  const name = tenant.name?.trim() || slug;

  return {
    tenantId,
    branchId: tenantId as BranchId,
    name,
    slug,
    point: { lat, lng },
    geohash,
    maxRadiusKm: tenant.deliveryConfig?.maxRadius,
    prepTimeMins: tenant.deliveryConfig?.prepTime,
    cuisineTags: tenant.cuisineTags,
    rating: tenant.ratingAggregate,
    dietaryPreference: tenant.dietaryPreference,
    isOpen: tenant.storeOperations?.isStoreOpen,
    isLive: tenant.storeStatus === 'published' || tenant.storeStatus === 'active',
    status: tenant.status,
    thumbnailUrl: tenant.branding?.logoUrl ?? tenant.logo,
  };
}

export function mapTenantsToDiscoveryCandidates(
  tenants: readonly TenantReadRecord[]
): DiscoveryCandidate[] {
  return tenants
    .map(mapTenantToDiscoveryCandidate)
    .filter((candidate): candidate is DiscoveryCandidate => candidate !== null);
}

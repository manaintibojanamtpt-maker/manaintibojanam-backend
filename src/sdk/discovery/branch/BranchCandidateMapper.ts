/**
 * DiscoverySDK — branch read record → DiscoveryCandidate mapper (M5 PR-6).
 * Pure mapping — no ranking, eligibility, or branch selection.
 */

import { encodeGeohashPoint } from '../../location/adapters/localGeoComputation';
import type { Geohash } from '../types/branded';
import type { DiscoveryCandidate } from '../dto/candidates';
import type { TenantReadRecord } from '../repository/ports/TenantRepositoryPort';
import type { TenantId } from '../../core/types';
import {
  type DiscoveryBranchReadRecord,
  toDiscoveryBranchId,
} from './BranchCandidateTypes';

const isActiveBranch = (branch: DiscoveryBranchReadRecord): boolean =>
  branch.status === 'active';

const resolveGeohash = (
  branch: DiscoveryBranchReadRecord
): Geohash | null => {
  const stored = branch.location.geohash?.trim();
  if (stored) {
    return stored as Geohash;
  }

  const { lat, lng } = branch.location;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    return null;
  }

  const encoded = encodeGeohashPoint({ lat, lng }, 7);
  if (encoded.ok === false) {
    return null;
  }

  return encoded.value as Geohash;
};

export const mapBranchToDiscoveryCandidate = (
  branch: DiscoveryBranchReadRecord,
  tenant: TenantReadRecord
): DiscoveryCandidate | null => {
  if (!isActiveBranch(branch)) {
    return null;
  }

  const geohash = resolveGeohash(branch);
  if (!geohash) {
    return null;
  }

  const tenantId = tenant.id as TenantId;
  const brandName = tenant.name?.trim() || tenant.slug?.trim() || tenant.id;
  const displayName =
    branch.name.trim() === brandName ? branch.name.trim() : `${brandName} — ${branch.name.trim()}`;

  return {
    tenantId,
    branchId: toDiscoveryBranchId(branch.branchId),
    name: displayName,
    slug: tenant.slug?.trim() || tenant.id,
    point: {
      lat: branch.location.lat,
      lng: branch.location.lng,
    },
    geohash,
    maxRadiusKm: branch.maxRadiusKm ?? tenant.deliveryConfig?.maxRadius,
    prepTimeMins: branch.prepTimeMins ?? tenant.deliveryConfig?.prepTime,
    cuisineTags: tenant.cuisineTags,
    rating: branch.rating ?? tenant.ratingAggregate,
    isOpen: branch.isOpen ?? tenant.storeOperations?.isStoreOpen,
    isLive: tenant.storeStatus === 'published' || tenant.storeStatus === 'active',
    status: branch.status,
    thumbnailUrl: tenant.branding?.logoUrl ?? tenant.logo,
  };
};

export const mapBranchesToDiscoveryCandidates = (
  branches: readonly DiscoveryBranchReadRecord[],
  tenant: TenantReadRecord
): DiscoveryCandidate[] =>
  branches
    .map((branch) => mapBranchToDiscoveryCandidate(branch, tenant))
    .filter((candidate): candidate is DiscoveryCandidate => candidate !== null);

export const sortDiscoveryCandidatesDeterministic = (
  candidates: readonly DiscoveryCandidate[]
): DiscoveryCandidate[] =>
  [...candidates].sort((left, right) => {
    const tenantCompare = String(left.tenantId).localeCompare(String(right.tenantId));
    if (tenantCompare !== 0) {
      return tenantCompare;
    }

    return String(left.branchId).localeCompare(String(right.branchId));
  });

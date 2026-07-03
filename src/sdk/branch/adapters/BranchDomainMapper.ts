/**
 * BranchSDK — domain ↔ SDK DTO mappers (M5 PR-4).
 * Pure mapping — no business rules.
 */

import { BRANCH_DEFAULT_MAX_RADIUS_KM } from '../../../domain/branch/shared/BranchConstants';
import type { BranchEligibilityResult as DomainEligibilityResult } from '../../../domain/branch/shared/BranchTypes';
import type { BranchValidationResult as DomainValidationResult } from '../../../domain/branch/shared/BranchTypes';
import type { BranchOperationalSnapshot } from '../../../domain/branch/shared/BranchTypes';
import { computeHaversineDistanceKm } from '../../location/adapters/localGeoComputation';
import type { GeoPoint } from '../../location/dto/geo';
import type { TenantId } from '../../core/types';
import type {
  BranchCapacityRecord,
  BranchDetail,
  BranchEligibility,
  BranchETAEstimate,
  BranchInventorySnapshot,
  BranchStatusSnapshot,
  BranchSummary,
  BranchCandidate,
  BranchValidationResult,
} from '../dto';
import type { BranchOrderType, BranchId } from '../types/branded';

export const DEFAULT_BRANCH_DELIVERY_ZONE = {
  maxRadiusKm: BRANCH_DEFAULT_MAX_RADIUS_KM,
} as const;

export const computeCustomerDistanceKm = (
  customerPoint: GeoPoint,
  branchPoint: GeoPoint | undefined
): number => {
  if (!branchPoint) {
    return 0;
  }

  return computeHaversineDistanceKm(customerPoint, branchPoint);
};

export const mapEligibilityToDto = (eligibility: DomainEligibilityResult): BranchEligibility => ({
  branchId: eligibility.branchId as BranchId,
  isEligible: eligibility.isEligible,
  status: eligibility.status,
  distanceKm: eligibility.distanceKm,
  maxRadiusKm: eligibility.maxRadiusKm,
  reasons: eligibility.reasons,
});

export const mapValidationToDto = (validation: DomainValidationResult): BranchValidationResult => ({
  branchId: validation.branchId as BranchId,
  isValid: validation.isValid,
  eligibility: mapEligibilityToDto(validation.eligibility),
  issues: validation.issues,
});

export const mapToBranchCandidate = (
  snapshot: BranchOperationalSnapshot,
  eligibility: DomainEligibilityResult
): BranchCandidate => ({
  branchId: snapshot.branchId as BranchId,
  name: snapshot.name,
  distanceKm: eligibility.distanceKm,
  eligibility: mapEligibilityToDto(eligibility),
});

export const buildBranchEtaEstimate = (
  branchId: BranchId,
  prepTimeMins: number,
  distanceKm: number,
  orderType: BranchOrderType
): BranchETAEstimate => {
  const deliveryTimeMins = orderType === 'pickup' ? 0 : Math.ceil(distanceKm * 3);
  const totalMins = prepTimeMins + deliveryTimeMins;
  const confidence = totalMins <= 45 ? 'high' : totalMins <= 70 ? 'medium' : 'low';

  return {
    branchId,
    prepTimeMins,
    deliveryTimeMins,
    totalMins,
    confidence,
  };
};

export interface BranchOperationalReadBundle {
  readonly summary: BranchSummary;
  readonly detail: BranchDetail;
  readonly status?: BranchStatusSnapshot;
  readonly capacity?: BranchCapacityRecord;
  readonly inventory?: BranchInventorySnapshot;
}

export const mapReadBundleToOperationalSnapshot = (
  bundle: BranchOperationalReadBundle,
  customerPoint: GeoPoint,
  maxRadiusKm: number = DEFAULT_BRANCH_DELIVERY_ZONE.maxRadiusKm
): BranchOperationalSnapshot => {
  const distanceKm = computeCustomerDistanceKm(customerPoint, bundle.detail.location.point);

  return {
    branchId: String(bundle.summary.branchId),
    tenantId: String(bundle.summary.tenantId),
    name: bundle.summary.name,
    status: bundle.summary.status,
    isDefault: bundle.summary.isDefault,
    distanceKm,
    deliveryZone: { maxRadiusKm },
    isOpen: bundle.status?.isOpen ?? false,
    isBusy: bundle.status?.isBusy ?? false,
    acceptingOrders: bundle.capacity?.acceptingOrders ?? true,
    congestionLevel: bundle.capacity?.congestionLevel,
    activeOrders: bundle.capacity?.activeOrders,
    maxConcurrentOrders: bundle.capacity?.maxConcurrentOrders,
    prepQueueMins: bundle.capacity?.prepQueueMins,
    etaMins: bundle.capacity ? bundle.capacity.prepQueueMins + Math.ceil(distanceKm * 3) : undefined,
    unavailableMenuItemIds: bundle.inventory?.unavailableItemIds ?? [],
  };
};

export const mapTenantId = (tenantId: TenantId): string => String(tenantId);

/**
 * Branch domain — eligibility rule constants (M5 PR-2).
 */

import type { BranchCongestionLevel, BranchOperationalStatus } from '../shared/BranchTypes';

export const INELIGIBLE_BRANCH_STATUSES: readonly BranchOperationalStatus[] = [
  'draft',
  'closed',
  'suspended',
] as const;

export const BLOCKING_CONGESTION_LEVELS: readonly BranchCongestionLevel[] = [
  'critical',
] as const;

export const isOperationalStatusEligible = (status: BranchOperationalStatus): boolean =>
  !INELIGIBLE_BRANCH_STATUSES.includes(status);

export const isCongestionBlocking = (level: BranchCongestionLevel | undefined): boolean =>
  level !== undefined && BLOCKING_CONGESTION_LEVELS.includes(level);

export const isWithinRadius = (distanceKm: number, maxRadiusKm: number): boolean => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return false;
  }
  if (!Number.isFinite(maxRadiusKm) || maxRadiusKm <= 0) {
    return false;
  }
  return distanceKm <= maxRadiusKm;
};

export const hasInventoryCoverage = (
  cartItemIds: readonly string[] | undefined,
  unavailableMenuItemIds: readonly string[] | undefined,
  requireFullCoverage: boolean
): boolean => {
  if (!cartItemIds || cartItemIds.length === 0) {
    return true;
  }

  const unavailable = new Set(unavailableMenuItemIds ?? []);
  const missingCount = cartItemIds.filter((itemId) => unavailable.has(itemId)).length;

  if (!requireFullCoverage) {
    return missingCount < cartItemIds.length;
  }

  return missingCount === 0;
};

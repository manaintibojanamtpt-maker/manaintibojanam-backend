/**
 * Branch domain — branch score calculator (M5 PR-2).
 * Pure, deterministic scoring — no side effects.
 */

import {
  BRANCH_DEFAULT_MAX_DELIVERY_FEE,
  BRANCH_DEFAULT_MAX_ETA_MINS,
  BRANCH_SCORE_MAX,
} from '../shared/BranchConstants';
import type { BranchOperationalSnapshot, BranchScoreBreakdown } from '../shared/BranchTypes';
import { buildBranchScoreBreakdown, buildBranchScoreFactor, clampBranchScore } from './BranchScoreBreakdown';
import {
  BRANCH_DOMAIN_SCORE_WEIGHTS,
  type BranchScoreWeights,
} from './BranchScoreWeights';

export interface BranchScoreInput {
  readonly branch: BranchOperationalSnapshot;
  readonly cartItemIds?: readonly string[];
  readonly maxDeliveryFee?: number;
  readonly maxEtaMins?: number;
}

export const normalizeDistanceSignal = (distanceKm: number, maxRadiusKm: number): number => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return 0;
  }
  if (!Number.isFinite(maxRadiusKm) || maxRadiusKm <= 0) {
    return 0;
  }
  if (distanceKm > maxRadiusKm) {
    return 0;
  }
  return clampBranchScore(1 - distanceKm / maxRadiusKm);
};

export const normalizeEtaSignal = (
  etaMins: number | undefined,
  maxEtaMins: number = BRANCH_DEFAULT_MAX_ETA_MINS
): number => {
  if (!Number.isFinite(etaMins) || (etaMins as number) <= 0) {
    return 0;
  }
  if (!Number.isFinite(maxEtaMins) || maxEtaMins <= 0) {
    return 0;
  }
  return clampBranchScore(1 - (etaMins as number) / maxEtaMins);
};

export const normalizeDeliveryFeeSignal = (
  deliveryFee: number | undefined,
  maxDeliveryFee: number = BRANCH_DEFAULT_MAX_DELIVERY_FEE
): number => {
  if (!Number.isFinite(deliveryFee) || (deliveryFee as number) < 0) {
    return BRANCH_SCORE_MAX;
  }
  if (!Number.isFinite(maxDeliveryFee) || maxDeliveryFee <= 0) {
    return BRANCH_SCORE_MAX;
  }
  return clampBranchScore(1 - (deliveryFee as number) / maxDeliveryFee);
};

export const normalizeCapacityHeadroomSignal = (
  activeOrders: number | undefined,
  maxConcurrentOrders: number | undefined
): number => {
  if (!Number.isFinite(maxConcurrentOrders) || (maxConcurrentOrders as number) <= 0) {
    return BRANCH_SCORE_MAX;
  }
  if (!Number.isFinite(activeOrders) || (activeOrders as number) < 0) {
    return BRANCH_SCORE_MAX;
  }
  const headroom = (maxConcurrentOrders as number) - (activeOrders as number);
  return clampBranchScore(headroom / (maxConcurrentOrders as number));
};

export const computeInventoryCoverage = (
  cartItemIds: readonly string[] | undefined,
  unavailableMenuItemIds: readonly string[] | undefined
): number => {
  if (!cartItemIds || cartItemIds.length === 0) {
    return BRANCH_SCORE_MAX;
  }

  const unavailable = new Set(unavailableMenuItemIds ?? []);
  const availableCount = cartItemIds.filter((itemId) => !unavailable.has(itemId)).length;
  return clampBranchScore(availableCount / cartItemIds.length);
};

export const normalizeRatingSignal = (rating: number | undefined): number => {
  if (!Number.isFinite(rating) || (rating as number) <= 0) {
    return 0;
  }
  return clampBranchScore((rating as number) / 5);
};

export const normalizeOpenStatusSignal = (isOpen: boolean, acceptingOrders: boolean): number => {
  if (!isOpen || !acceptingOrders) {
    return 0;
  }
  return BRANCH_SCORE_MAX;
};

export const calculateBranchScore = (
  input: BranchScoreInput,
  weights: BranchScoreWeights = BRANCH_DOMAIN_SCORE_WEIGHTS
): BranchScoreBreakdown => {
  const { branch } = input;
  const maxRadiusKm = branch.deliveryZone.maxRadiusKm;
  const cartItemIds = input.cartItemIds;

  const factors = [
    buildBranchScoreFactor(
      'distance',
      weights.distance,
      normalizeDistanceSignal(branch.distanceKm, maxRadiusKm),
      'distance proximity'
    ),
    buildBranchScoreFactor(
      'eta',
      weights.eta,
      normalizeEtaSignal(branch.etaMins, input.maxEtaMins),
      'estimated time'
    ),
    buildBranchScoreFactor(
      'delivery_fee',
      weights.delivery_fee,
      normalizeDeliveryFeeSignal(branch.deliveryFee, input.maxDeliveryFee),
      'delivery fee'
    ),
    buildBranchScoreFactor(
      'capacity_headroom',
      weights.capacity_headroom,
      normalizeCapacityHeadroomSignal(branch.activeOrders, branch.maxConcurrentOrders),
      'kitchen capacity'
    ),
    buildBranchScoreFactor(
      'inventory_availability',
      weights.inventory_availability,
      computeInventoryCoverage(cartItemIds, branch.unavailableMenuItemIds),
      'inventory coverage'
    ),
    buildBranchScoreFactor(
      'rating',
      weights.rating,
      normalizeRatingSignal(branch.rating),
      'branch rating'
    ),
    buildBranchScoreFactor(
      'open_status',
      weights.open_status,
      normalizeOpenStatusSignal(branch.isOpen, branch.acceptingOrders),
      'open status'
    ),
  ];

  return buildBranchScoreBreakdown(branch.branchId, factors);
};

export const rankScoredBranches = (
  scored: readonly BranchScoreBreakdown[]
): BranchScoreBreakdown[] =>
  [...scored].sort((left, right) => {
    if (left.total !== right.total) {
      return right.total - left.total;
    }
    return left.branchId.localeCompare(right.branchId);
  });

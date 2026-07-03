/**
 * Discovery domain — maps evaluation results to EligibleCandidate (M3 PR-4).
 */

import type { DiscoveryCandidate } from '../../../sdk/discovery/dto/candidates';
import type { DeliveryEligibility, DeliveryEligibilityStatus } from '../../../sdk/discovery/dto/eligibility';
import type { EligibilityReason, EligibleCandidate } from '../../../sdk/discovery/dto/eligibleCandidate';
import type { GeoPoint } from '../../../sdk/location/dto/geo';
import { estimateDiscoveryDeliveryFee } from './DeliveryFeeEstimate';
import { calculateDiscoveryDistanceKm, isValidGeoPoint } from './DistanceCalculator';
import { isDeliveryConfigValid, isWithinDeliveryRadius } from './RadiusValidator';

const isBranchActive = (candidate: DiscoveryCandidate): boolean =>
  String(candidate.status ?? '').toLowerCase() === 'active';

const buildReason = (
  rule: EligibilityReason['rule'],
  passed: boolean,
  message?: string
): EligibilityReason => ({ rule, passed, message });

export function evaluateEligibilityRules(
  candidate: DiscoveryCandidate,
  customerPoint: GeoPoint
): {
  readonly reasons: EligibilityReason[];
  readonly distanceKm: number;
  readonly isEligible: boolean;
} {
  const branchCoordsValid = isValidGeoPoint(candidate.point);
  const customerCoordsValid = isValidGeoPoint(customerPoint);
  const coordsValid = branchCoordsValid && customerCoordsValid;

  const branchActive = isBranchActive(candidate);
  const branchLive = candidate.isLive === true;
  const kitchenOpen = candidate.isOpen === true;
  const deliveryConfigValid = isDeliveryConfigValid(candidate.maxRadiusKm);

  const distanceKm =
    coordsValid ? calculateDiscoveryDistanceKm(customerPoint, candidate.point) : Number.NaN;

  const insideRadius =
    coordsValid &&
    deliveryConfigValid &&
    isWithinDeliveryRadius(distanceKm, candidate.maxRadiusKm);

  const reasons: EligibilityReason[] = [
    buildReason(
      'valid_coordinates',
      coordsValid,
      coordsValid ? undefined : 'Customer or branch coordinates are missing or invalid'
    ),
    buildReason(
      'branch_active',
      branchActive,
      branchActive ? undefined : 'Branch is not active'
    ),
    buildReason(
      'branch_live',
      branchLive,
      branchLive ? undefined : 'Branch is not live'
    ),
    buildReason(
      'kitchen_open',
      kitchenOpen,
      kitchenOpen ? undefined : 'Kitchen is closed'
    ),
    buildReason(
      'delivery_config_valid',
      deliveryConfigValid,
      deliveryConfigValid ? undefined : 'Delivery radius is missing or invalid'
    ),
    buildReason(
      'inside_delivery_radius',
      insideRadius,
      insideRadius ? undefined : 'Customer is outside the delivery radius'
    ),
  ];

  const isEligible = reasons.every((reason) => reason.passed);

  return {
    reasons,
    distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
    isEligible,
  };
}

const resolveEligibilityStatus = (
  reasons: readonly EligibilityReason[]
): DeliveryEligibilityStatus => {
  const byRule = new Map(reasons.map((reason) => [reason.rule, reason]));

  if (byRule.get('kitchen_open')?.passed === false) {
    return 'closed';
  }
  if (byRule.get('inside_delivery_radius')?.passed === false) {
    return 'out_of_radius';
  }
  if (reasons.every((reason) => reason.passed)) {
    return 'serviceable';
  }
  return 'unavailable';
};

const primaryFailureMessage = (reasons: readonly EligibilityReason[]): string | undefined => {
  const failed = reasons.find((reason) => !reason.passed);
  return failed?.message;
};

export function mapToEligibleCandidate(
  candidate: DiscoveryCandidate,
  customerPoint: GeoPoint
): EligibleCandidate {
  const evaluation = evaluateEligibilityRules(candidate, customerPoint);
  const status = resolveEligibilityStatus(evaluation.reasons);
  const estimatedFee =
    evaluation.isEligible
      ? estimateDiscoveryDeliveryFee(evaluation.distanceKm, candidate.maxRadiusKm)
      : undefined;

  const eligibility: DeliveryEligibility = {
    status,
    isServiceable: evaluation.isEligible,
    distanceKm: evaluation.distanceKm,
    maxRadiusKm: candidate.maxRadiusKm,
    estimatedFee: estimatedFee !== undefined && estimatedFee >= 0 ? estimatedFee : undefined,
    reason: evaluation.isEligible ? undefined : primaryFailureMessage(evaluation.reasons),
  };

  return {
    candidate,
    isEligible: evaluation.isEligible,
    distanceKm: evaluation.distanceKm,
    eligibility,
    reasons: evaluation.reasons,
  };
}

export function mapToEligibleCandidates(
  candidates: readonly DiscoveryCandidate[],
  customerPoint: GeoPoint
): EligibleCandidate[] {
  return candidates.map((candidate) => mapToEligibleCandidate(candidate, customerPoint));
}

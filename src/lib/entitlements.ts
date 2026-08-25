/**
 * Frontend Entitlement Utilities
 * Re-exports canonical entitlements for frontend use.
 * DO NOT MODIFY THE MATRIX HERE — it is defined in backend-lib/canonicalEntitlements.ts
 */

import {
  CANONICAL_ENTITLEMENT_MATRIX,
  PLAN_HIERARCHY,
  type PlanId,
  type FeatureKey,
  hasEntitlement as canonicalHasEntitlement,
} from '../../backend-lib/canonicalEntitlements.js';

// Re-export for frontend compatibility
export type { PlanId, FeatureKey };
export { CANONICAL_ENTITLEMENT_MATRIX as ENTITLEMENT_MATRIX, PLAN_HIERARCHY };

/**
 * Check if a plan has a feature entitlement (non-throwing, for UI logic).
 * This is the frontend version - does not throw, returns boolean.
 */
export function hasEntitlement(
  planId: string | undefined | null,
  featureKey: FeatureKey
): boolean {
  return canonicalHasEntitlement(planId, featureKey);
}
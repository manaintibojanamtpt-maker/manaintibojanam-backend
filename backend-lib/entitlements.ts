/**
 * Server-Side Entitlement Enforcement
 * Re-exports canonical entitlements and provides middleware.
 * DO NOT MODIFY THE MATRIX HERE — it is defined in canonicalEntitlements.ts
 */

import type { Request, Response, NextFunction } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { resolveTenantIdFromRequest } from './shared/apiGatewayMiddleware.js';
import {
  CANONICAL_ENTITLEMENT_MATRIX,
  PLAN_HIERARCHY,
  type PlanId,
  type FeatureKey,
  type SubscriptionStatus,
  type SubscriptionState,
  type TrialState,
  assertEntitlement as canonicalAssertEntitlement,
  hasEntitlement as canonicalHasEntitlement,
  computeSubscriptionState,
  computeTrialState,
  requireEntitlement as canonicalRequireEntitlement,
  validateSuperAdminOverride,
  TRIAL_RULES,
} from './canonicalEntitlements.js';

// Re-export canonical types and constants
export type { PlanId, FeatureKey, SubscriptionStatus, SubscriptionState, TrialState };
export { CANONICAL_ENTITLEMENT_MATRIX as ENTITLEMENT_MATRIX, PLAN_HIERARCHY, TRIAL_RULES };
export { canonicalHasEntitlement as hasEntitlement, canonicalAssertEntitlement as assertPlanEntitlement, computeSubscriptionState, computeTrialState, validateSuperAdminOverride };

/**
 * Check if a tenant has a specific feature entitlement.
 * Returns the tenant's effective plan ID if entitled, throws an error with statusCode if not.
 *
 * @param db - Firestore instance
 * @param tenantId - The tenant ID to check (must be resolved/authoritative, not from query/body)
 * @param featureKey - The feature key to check (e.g., 'deliveryEngine')
 * @returns The effective plan ID if entitled
 * @throws Error with statusCode 403 and requiresUpgrade: true if not entitled
 * @throws Error with statusCode 404 if tenant not found
 */
export async function assertEntitlement(
  db: Firestore,
  tenantId: string,
  featureKey: FeatureKey
): Promise<PlanId> {
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    const err: any = new Error('Kitchen not found');
    err.statusCode = 404;
    throw err;
  }

  const tenantData = tenantDoc.data()!;
  const subscriptionState = computeSubscriptionState(tenantData);

  return canonicalAssertEntitlement(subscriptionState.planId, featureKey);
}

/**
 * Helper to check deliveryEngine entitlement for a resolved tenant.
 * Uses SaaS entitlement semantics: throws 403 with requiresUpgrade=true if not entitled.
 */
export async function assertDeliveryEngineEntitlement(
  db: Firestore,
  tenantId: string
): Promise<PlanId> {
  return assertEntitlement(db, tenantId, 'deliveryEngine');
}

// Middleware factory for enforcing capabilities (reads tenantId from params/body/query/header/URL path)
export function requireEntitlement(db: Firestore, featureKey: FeatureKey) {
  return canonicalRequireEntitlement(db, featureKey);
}
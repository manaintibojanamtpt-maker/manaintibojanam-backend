import type { Request, Response, NextFunction } from 'express';
import type { Firestore } from 'firebase-admin/firestore';

export type PlanId = 'starter' | 'growth' | 'pro' | 'enterprise';

export const ENTITLEMENT_MATRIX: Record<PlanId, string[]> = {
  starter: ['storefront', 'directOrders', 'basicAnalytics'],
  growth: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore'],
  pro: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore', 'aiFull', 'deliveryEngine', 'customerMemory'],
  enterprise: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore', 'aiFull', 'deliveryEngine', 'customerMemory', 'customIntegrations'],
};

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
  featureKey: string
): Promise<PlanId> {
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    const err: any = new Error('Kitchen not found');
    err.statusCode = 404;
    throw err;
  }

  const tenantData = tenantDoc.data();
  const subscription = tenantData?.subscription || {};

  // Determine effective plan
  let effectivePlanId: PlanId = 'starter';
  if (subscription.planId && Object.keys(ENTITLEMENT_MATRIX).includes(subscription.planId)) {
    effectivePlanId = subscription.planId as PlanId;
  }

  // Grace period checking: if past_due, downgrade effective capabilities or block?
  // For now, if status is canceled, fallback to starter capabilities
  if (subscription.status === 'canceled') {
    effectivePlanId = 'starter';
  }

  // Check if plan grants feature
  const allowedFeatures = ENTITLEMENT_MATRIX[effectivePlanId] || [];
  if (!allowedFeatures.includes(featureKey)) {
    const err: any = new Error(
      `Your current plan (${effectivePlanId}) does not support ${featureKey}. Please upgrade to access this feature.`
    );
    err.statusCode = 403;
    err.requiresUpgrade = true;
    throw err;
  }

  return effectivePlanId;
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


// Middleware factory for enforcing capabilities (legacy - reads tenantId from body/query)
export function requireEntitlement(db: Firestore, featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // tenantId comes from req.body (POST/PUT) or req.query (GET)
      const tenantId = (req.body?.tenantId || req.query?.tenantId) as string;

      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'tenantId is required for entitlement check' });
      }

      await assertEntitlement(db, tenantId, featureKey);
      next();
    } catch (error) {
      const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
      if (err.statusCode) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message || 'Entitlement check failed',
          requiresUpgrade: err.requiresUpgrade,
        });
      }
      console.error('requireEntitlement error:', error);
      res.status(500).json({ success: false, error: 'Internal server error checking entitlements' });
    }
  };
}

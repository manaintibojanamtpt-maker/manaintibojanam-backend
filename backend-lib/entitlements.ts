import type { Request, Response, NextFunction } from 'express';
import type { Firestore } from 'firebase-admin/firestore';

export type PlanId = 'starter' | 'growth' | 'pro' | 'enterprise';

export const ENTITLEMENT_MATRIX: Record<PlanId, string[]> = {
  starter: ['storefront', 'directOrders', 'basicAnalytics'],
  growth: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore'],
  pro: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore', 'aiFull', 'deliveryEngine', 'customerMemory'],
  enterprise: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore', 'aiFull', 'deliveryEngine', 'customerMemory', 'customIntegrations'],
};

// Middleware factory for enforcing capabilities
export function requireEntitlement(db: Firestore, featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // tenantId comes from req.body (POST/PUT) or req.query (GET)
      const tenantId = (req.body?.tenantId || req.query?.tenantId) as string;
      
      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'tenantId is required for entitlement check' });
      }

      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
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
        return res.status(403).json({
          success: false,
          error: `Your current plan (${effectivePlanId}) does not support ${featureKey}. Please upgrade to access this feature.`,
          requiresUpgrade: true,
        });
      }

      next();
    } catch (error) {
      console.error('requireEntitlement error:', error);
      res.status(500).json({ success: false, error: 'Internal server error checking entitlements' });
    }
  };
}

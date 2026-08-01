export type PlanId = 'starter' | 'growth' | 'pro' | 'enterprise';

export const ENTITLEMENT_MATRIX: Record<PlanId, string[]> = {
  starter: ['storefront', 'directOrders', 'basicAnalytics'],
  growth: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore'],
  pro: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore', 'aiFull', 'deliveryEngine', 'customerMemory'],
  enterprise: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore', 'aiFull', 'deliveryEngine', 'customerMemory', 'customIntegrations'],
};

export function hasEntitlement(planId: string | undefined | null, featureKey: string): boolean {
  if (!planId) planId = 'starter';
  
  let effectivePlanId: PlanId = 'starter';
  if (Object.keys(ENTITLEMENT_MATRIX).includes(planId)) {
    effectivePlanId = planId as PlanId;
  }
  
  const allowedFeatures = ENTITLEMENT_MATRIX[effectivePlanId] || [];
  return allowedFeatures.includes(featureKey);
}

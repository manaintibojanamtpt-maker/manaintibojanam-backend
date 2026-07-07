import { ownerApiRequest } from './ownerProvisioning';
import type { PaidPlanId } from '../config/pricing';

export async function upgradeOwnerSubscriptionPlan(tenantId: string, planId: PaidPlanId) {
  return ownerApiRequest<{ success: boolean; tenantId: string; planId: string; unchanged?: boolean }>(
    'PUT',
    '/api/owner/subscription/plan',
    { tenantId, planId },
  );
}

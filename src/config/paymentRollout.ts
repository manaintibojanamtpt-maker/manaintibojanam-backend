/** Tenant 0 — Mana Inti Bojanam uses Razorpay gateway only in Phase 1. */
export const TENANT_ZERO_ID = 'mana-inti';

/**
 * Manual UPI / owner "payment received" flows are Phase 2.
 * Returns false for Tenant 0 and all tenants until Phase 2 rollout.
 */
export const isManualPaymentVerificationEnabled = (tenantId?: string | null): boolean => {
  if (!tenantId || tenantId === TENANT_ZERO_ID) return false;
  return false;
};

export const isGatewayOnlyTenant = (tenantId?: string | null): boolean =>
  !tenantId || tenantId === TENANT_ZERO_ID;

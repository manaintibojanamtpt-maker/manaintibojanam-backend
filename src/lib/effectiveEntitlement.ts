import {
  type PlanId,
  type SubscriptionStatus,
  computeSubscriptionState,
  computeTrialState,
  hasEntitlement,
} from '../../backend-lib/canonicalEntitlements.js';

export type EffectiveEntitlementResult = {
  effectivePlanId: PlanId;
  status: SubscriptionStatus;
  isTrialActive: boolean;
  isExpired: boolean;
  isSuspended: boolean;
  canAcceptOrders: boolean;
  founderOverride: boolean;
  displayLabel: string;
};

/**
 * Computes canonical entitlement status for any tenant document on the frontend.
 * Guarantees that founder overrides, active paid plans, active trials, and expired trials
 * are evaluated consistently everywhere (Owner Orders, Owner Subscription, Super Admin table).
 */
export function getEffectiveEntitlement(tenant: any): EffectiveEntitlementResult {
  if (!tenant) {
    return {
      effectivePlanId: 'starter',
      status: 'none',
      isTrialActive: false,
      isExpired: false,
      isSuspended: false,
      canAcceptOrders: true,
      founderOverride: false,
      displayLabel: 'Starter · Active',
    };
  }

  const subState = computeSubscriptionState(tenant);
  const trialState = computeTrialState(tenant.subscription ?? { trialExpiresAt: tenant.trialEndsAt });

  const founderOverride = subState.founderOverride === true;
  const isTrialActive = trialState.isActive;
  const status = subState.status;

  // Root tenant status can explicitly suspend a merchant
  const isExplicitlySuspended = tenant.status === 'suspended';

  // Expired only if status is expired AND not founder overridden
  const isExpired = !founderOverride && (status === 'expired' || (!isTrialActive && subState.planId !== 'starter' && status !== 'active'));

  // Suspended if explicitly suspended OR trial expired without founder override / active status
  const isSuspended = isExplicitlySuspended || isExpired;

  // Merchant can accept orders if not suspended AND has directOrders entitlement
  const canAcceptOrders = !isSuspended && hasEntitlement(subState.planId, 'directOrders');

  // Human-readable display label for CRM / tables
  let displayLabel = `${subState.planId.charAt(0).toUpperCase() + subState.planId.slice(1)} · ${status}`;
  if (founderOverride) {
    displayLabel = `${subState.planId.charAt(0).toUpperCase() + subState.planId.slice(1)} · Granted`;
  } else if (isTrialActive) {
    displayLabel = `${subState.planId.charAt(0).toUpperCase() + subState.planId.slice(1)} trial · ${trialState.daysRemaining} days left`;
  } else if (isExpired) {
    displayLabel = `${subState.planId.charAt(0).toUpperCase() + subState.planId.slice(1)} · Expired`;
  }

  return {
    effectivePlanId: subState.planId,
    status,
    isTrialActive,
    isExpired,
    isSuspended,
    canAcceptOrders,
    founderOverride,
    displayLabel,
  };
}

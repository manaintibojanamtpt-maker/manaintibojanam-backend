import {
  type PlanId,
  type PaidPlanId,
  type SubscriptionState,
  type SubscriptionStatus,
  type TrialState,
  type TrialType,
  computeSubscriptionState,
  computeTrialState,
  getUpgradePath,
  upgradeRequiresPayment,
  computeNextBillingPeriod,
  computeRenewalState,
  isBillableStatus,
  isPeriodEnded,
  BILLING_CYCLE,
  TRIAL_RULES,
  PLAN_HIERARCHY,
} from '../../backend-lib/canonicalEntitlements.js';
import { hasEntitlement } from './entitlements';

// Re-export canonical types and constants
export { TRIAL_RULES, PLAN_HIERARCHY };
export type { PlanId, PaidPlanId, SubscriptionState, TrialState, TrialType };

// Type for tenant data from Firestore
type TenantPlanSnapshot = {
  subscription?: {
    planId?: string;
    status?: string;
    trialExpiresAt?: string;
    trialType?: string;
    onboardingTrial?: boolean;
    trialUsed?: boolean;
    trialActivatedAt?: string;
    paidActivatedAt?: string;
    founderOverride?: boolean;
    founderOverrideAction?: string;
    founderOverrideBy?: string;
    founderOverrideAt?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };
  storeStatus?: string;
  sandboxMode?: boolean;
  onboardingStatus?: {
    isComplete?: boolean;
    migrated?: boolean;
  };
};

/**
 * Check if a trial is currently active (hasn't expired yet).
 * Uses canonical computeTrialState.
 */
export function isTrialCurrentlyActive(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant) return false;
  const subscription = tenant.subscription || {};
  const trialState = computeTrialState(subscription);
  return trialState.isActive;
}

/**
 * Check if tenant is on growth onboarding trial.
 */
export function isOnGrowthOnboardingTrial(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant || !isTrialCurrentlyActive(tenant)) return false;
  const sub = tenant.subscription;
  if (sub?.onboardingTrial) return true;
  if (sub?.trialType === 'growth_onboarding') return true;
  return sub?.planId === 'growth' && sub?.status === 'trialing';
}

/** Plan id used for UI (handles growth trial even if planId not synced yet) */
export function getEffectivePlanId(tenant: TenantPlanSnapshot | null | undefined): PlanId {
  if (!tenant) return 'starter';
  const planId = tenant.subscription?.planId || 'starter';
  if (planId !== 'starter') return planId as PlanId;
  if (isOnGrowthOnboardingTrial(tenant)) return 'growth';
  return planId as PlanId;
}

/**
 * Check if growth trial has expired (but still in trial status).
 */
export function isGrowthTrialExpired(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant?.subscription?.trialExpiresAt) return false;
  const planId = tenant.subscription?.planId || 'starter';
  if (planId === 'starter') return false;
  return !isTrialCurrentlyActive(tenant) && tenant.subscription?.status === 'trialing';
}

/**
 * Check if trial is in grace period (3 days after expiry).
 */
export function isTrialInGracePeriod(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant?.subscription?.trialExpiresAt) return false;
  const sub = tenant.subscription;
  const trialState = computeTrialState(sub);
  return trialState.inGracePeriod;
}

/**
 * Check if pro trial has expired (but still in trial status).
 */
export function isProTrialExpired(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant?.subscription?.trialExpiresAt) return false;
  const planId = tenant.subscription?.planId || 'starter';
  if (planId !== 'pro') return false;
  if (tenant.subscription?.trialType && tenant.subscription.trialType !== 'paid_upgrade') return false;
  return !isTrialCurrentlyActive(tenant) && tenant.subscription?.status === 'trialing';
}

/**
 * Check if upgrade requires payment.
 * Uses canonical upgradeRequiresPayment.
 */
export function ownerPlanRequiresPayment(
  tenant: TenantPlanSnapshot | null | undefined,
  planId: string,
): boolean {
  if (!tenant || planId === 'enterprise' || planId === 'starter') return false;
  const effectivePlanId = getEffectivePlanId(tenant);
  if (planId === effectivePlanId) return false;

  // Create a minimal subscription state for canonical function
  const subState: SubscriptionState = {
    planId: effectivePlanId,
    status: isTrialCurrentlyActive(tenant) ? 'trialing' : (tenant.subscription?.status as any) || 'none',
    trialState: computeTrialState(tenant.subscription),
    currentPeriodStart: tenant.subscription?.currentPeriodStart || null,
    currentPeriodEnd: tenant.subscription?.currentPeriodEnd || null,
    cancelAtPeriodEnd: tenant.subscription?.cancelAtPeriodEnd === true,
    paidActivatedAt: tenant.subscription?.paidActivatedAt || null,
    trialUsed: tenant.subscription?.trialUsed === true,
    founderOverride: tenant.subscription?.founderOverride === true,
  };

  return upgradeRequiresPayment(subState, planId as PlanId);
}

/**
 * Check if plan action is available (not blocked).
 */
export function isOwnerPlanActionable(
  tenant: TenantPlanSnapshot | null | undefined,
  planId: string,
): boolean {
  if (planId === 'enterprise') return true;
  if (ownerPlanRequiresPayment(tenant, planId)) return true;
  if (isTrialCurrentlyActive(tenant) && getEffectivePlanId(tenant) === planId) return false;
  return getEffectivePlanId(tenant) !== planId;
}

/**
 * Get human-readable action label for plan card.
 */
export function getOwnerPlanActionLabel(
  planId: string,
  planName: string,
  ownerCta: string,
  tenant: TenantPlanSnapshot | null | undefined
): string {
  const effectivePlanId = getEffectivePlanId(tenant);
  const sub = tenant?.subscription;

  if (ownerPlanRequiresPayment(tenant, planId)) {
    const plan = planId === 'growth' ? '₹999/mo' : planId === 'pro' ? '₹2,999/mo' : '';
    if (isGrowthTrialExpired(tenant) && planId === 'growth') {
      return `Pay ${plan} to continue`;
    }
    if (isProTrialExpired(tenant) && planId === 'pro') {
      return `Pay ${plan} to continue`;
    }
    return plan ? `Pay ${plan}` : ownerCta;
  }

  if (planId === effectivePlanId) {
    if (isTrialCurrentlyActive(tenant) && isOnGrowthOnboardingTrial(tenant) && planId === 'growth') {
      return 'Current plan (14-day trial)';
    }
    if (isTrialCurrentlyActive(tenant)) {
      return 'Current plan (trial active)';
    }
    return ownerCta;
  }

  if (effectivePlanId !== 'starter') {
    return ownerCta;
  }

  if (planId === 'growth' && !sub?.trialUsed) {
    return `Start ${TRIAL_RULES.growthOnboardingDays}-day free trial`;
  }

  if (!sub?.trialUsed && planId === 'pro') {
    return `Try ${planName} — ${TRIAL_RULES.paidUpgradeDays} days free`;
  }

  return ownerCta;
}

/**
 * Get trial note for pricing card display.
 */
export function getOwnerTrialNote(
  planId: string,
  tenant: TenantPlanSnapshot | null | undefined,
  defaultNote?: string
): string | undefined {
  const effectivePlanId = getEffectivePlanId(tenant);

  if (planId === 'growth' && effectivePlanId === 'growth' && isOnGrowthOnboardingTrial(tenant)) {
    return `${TRIAL_RULES.growthOnboardingDays}-day Growth trial active`;
  }

  if (planId === 'growth' && effectivePlanId === 'starter') {
    return `${TRIAL_RULES.growthOnboardingDays}-day free trial when you go live`;
  }

  if (planId === 'pro' && effectivePlanId === 'starter' && !tenant?.subscription?.trialUsed) {
    return `${TRIAL_RULES.paidUpgradeDays}-day trial when upgrading from free`;
  }

  return defaultNote;
}

/**
 * Check if tenant has active growth access (for UI feature gating).
 */
export function hasActiveGrowthAccess(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant) return false;
  const effectivePlanId = getEffectivePlanId(tenant);
  if (tenant.subscription?.status === 'trialing' && tenant.subscription.trialExpiresAt) {
    if (new Date(tenant.subscription.trialExpiresAt).getTime() <= Date.now()) {
      return false; // Trial expired
    }
  }
  return hasEntitlement(effectivePlanId, 'advancedAnalytics');
}

/** Starter (or expired trial) still needs Growth activation */
export function needsGrowthTrialActivation(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant) return false;
  if (tenant.sandboxMode && tenant.storeStatus === 'published') return false;
  if (hasActiveGrowthAccess(tenant)) return false;

  const planId = tenant.subscription?.planId || 'starter';
  if (planId === 'starter') return true;

  if (tenant.subscription?.status === 'trialing' && tenant.subscription.trialExpiresAt) {
    return new Date(tenant.subscription.trialExpiresAt).getTime() <= Date.now();
  }

  return false;
}

/** @deprecated use needsGrowthTrialActivation */
export function needsGrowthToGoLive(tenant: TenantPlanSnapshot | null | undefined): boolean {
  return needsGrowthTrialActivation(tenant);
}

/**
 * Check if store is live for orders.
 */
export function isStoreLiveForOrders(
  tenant: TenantPlanSnapshot | null | undefined,
  acceptingOrders?: boolean
): boolean {
  if (!tenant) return !!acceptingOrders;
  if (acceptingOrders) return true;
  if (tenant.sandboxMode && tenant.storeStatus === 'published') return true;
  const status = tenant.storeStatus;
  return status === 'published' || status === 'active';
}

/**
 * Get growth trial days remaining.
 */
export function growthTrialDaysRemaining(tenant: TenantPlanSnapshot | null | undefined): number | null {
  if (!tenant?.subscription?.trialExpiresAt) return null;
  const sub = tenant.subscription;
  const trialState = computeTrialState(sub);
  if (!trialState.isActive) return 0;
  return trialState.daysRemaining;
}

/**
 * Get grace period days remaining.
 */
export function gracePeriodDaysRemaining(tenant: TenantPlanSnapshot | null | undefined): number | null {
  if (!tenant?.subscription?.trialExpiresAt) return null;
  const sub = tenant.subscription;
  const trialState = computeTrialState(sub);
  if (!trialState.inGracePeriod) return null;
  return trialState.graceDaysRemaining;
}

/**
 * Build growth onboarding trial patch for server.
 */
export function buildGrowthOnboardingTrialPatch() {
  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + TRIAL_RULES.growthOnboardingDays);
  return {
    storeStatus: 'active',
    status: 'trialing',
    trialEndsAt: expires.toISOString(),
    subscription: {
      planId: 'growth' as PlanId,
      status: 'trialing' as const,
      trialActivatedAt: now.toISOString(),
      trialExpiresAt: expires.toISOString(),
      trialType: 'growth_onboarding' as TrialType,
      onboardingTrial: true,
    },
  };
}

/**
 * Activate growth onboarding trial via API.
 */
export async function activateGrowthOnboardingTrial(tenantDocId: string): Promise<void> {
  const { ownerApiRequest } = await import('./ownerProvisioning');
  await ownerApiRequest('POST', '/api/owner/activate-growth-trial', { tenantId: tenantDocId });
}

/**
 * Cancel subscription at period end via API.
 */
export async function cancelOwnerSubscription(tenantDocId: string): Promise<void> {
  const { ownerApiRequest } = await import('./ownerProvisioning');
  await ownerApiRequest('POST', '/api/owner/subscription/cancel', { tenantId: tenantDocId });
}

/**
 * Resume a canceled subscription via API.
 */
export async function resumeOwnerSubscription(tenantDocId: string): Promise<void> {
  const { ownerApiRequest } = await import('./ownerProvisioning');
  await ownerApiRequest('POST', '/api/owner/subscription/resume', { tenantId: tenantDocId });
}

/**
 * Get detailed subscription status via API.
 */
export async function getOwnerSubscriptionStatus(tenantDocId: string): Promise<any> {
  const { ownerApiRequest } = await import('./ownerProvisioning');
  return ownerApiRequest('GET', `/api/owner/subscription/status?tenantId=${tenantDocId}`);
}

/**
 * Trigger billing retry for past_due subscription via API.
 */
export async function retryOwnerSubscriptionBilling(tenantDocId: string): Promise<void> {
  const { ownerApiRequest } = await import('./ownerProvisioning');
  await ownerApiRequest('POST', '/api/owner/subscription/billing-retry', { tenantId: tenantDocId });
}

/**
 * Check if subscription is in a billable state.
 */
export function isSubscriptionBillable(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant) return false;
  const state = computeSubscriptionState(tenant);
  return isBillableStatus(state.status);
}

/**
 * Check if subscription period has ended.
 */
export function isSubscriptionPeriodEnded(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant) return false;
  return isPeriodEnded(tenant);
}

/**
 * Get subscription renewal state (will it renew?).
 */
export function willSubscriptionRenew(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant) return false;
  const state = computeSubscriptionState(tenant);
  return isBillableStatus(state.status) && !state.cancelAtPeriodEnd;
}

/**
 * Get days until next billing.
 */
export function daysUntilNextBilling(tenant: TenantPlanSnapshot | null | undefined): number | null {
  if (!tenant?.subscription?.currentPeriodEnd) return null;
  const end = new Date(tenant.subscription.currentPeriodEnd).getTime();
  const now = Date.now();
  if (end <= now) return 0;
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

/**
 * Get failed payment attempts count.
 */
export function getFailedPaymentAttempts(tenant: TenantPlanSnapshot | null | undefined): number {
  if (!tenant?.subscription?.failedPaymentAttempts) return 0;
  return tenant.subscription.failedPaymentAttempts;
}

/**
 * Get next billing attempt date.
 */
export function getNextBillingAttemptAt(tenant: TenantPlanSnapshot | null | undefined): string | null {
  if (!tenant?.subscription?.nextBillingAttemptAt) return null;
  return tenant.subscription.nextBillingAttemptAt;
}

/**
 * Check if subscription is canceled at period end.
 */
export function isSubscriptionCanceledAtPeriodEnd(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant) return false;
  const state = computeSubscriptionState(tenant);
  return state.cancelAtPeriodEnd === true;
}

/**
 * Get subscription display status for UI (handles past_due, canceled, etc.).
 */
export function getSubscriptionDisplayStatus(tenant: TenantPlanSnapshot | null | undefined): string {
  if (!tenant) return 'none';
  const state = computeSubscriptionState(tenant);
  const trialState = computeTrialState(tenant.subscription);

  if (state.founderOverride) return 'active (founder)';
  if (trialState.isActive) return 'trialing';
  if (trialState.inGracePeriod) return 'grace_period';

  switch (state.status) {
    case 'active':
      return state.cancelAtPeriodEnd ? 'canceled_at_period_end' : 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'paused':
      return 'paused';
    case 'expired':
      return 'expired';
    default:
      return 'none';
  }
}

/**
 * Get human-readable subscription status for UI.
 */
export function getSubscriptionStatusLabel(tenant: TenantPlanSnapshot | null | undefined): string {
  if (!tenant) return 'No subscription';
  const state = computeSubscriptionState(tenant);
  const trialState = computeTrialState(tenant.subscription);

  if (state.founderOverride) return 'Active (Founder override)';
  if (trialState.isActive) {
    const type = trialState.type === 'growth_onboarding' ? 'Growth trial' :
                 trialState.type === 'paid_upgrade' ? 'Upgrade trial' : 'Trial';
    return `${type} (${trialState.daysRemaining} days left)`;
  }
  if (trialState.inGracePeriod) {
    return `Grace period (${trialState.graceDaysRemaining} days left)`;
  }

  switch (state.status) {
    case 'active':
      return state.cancelAtPeriodEnd
        ? `Active (cancels ${state.currentPeriodEnd ? new Date(state.currentPeriodEnd).toLocaleDateString() : 'at period end'})`
        : 'Active';
    case 'past_due':
      return `Payment failed — ${state.failedPaymentAttempts || 0} attempt(s)`;
    case 'canceled':
      return 'Canceled';
    case 'paused':
      return 'Paused';
    case 'expired':
      return 'Trial expired';
    default:
      return 'Free storefront';
  }
}

export function freeStorefrontBannerDismissKey(slug: string): string {
  return `free_storefront_banner_dismiss_${slug}`;
}
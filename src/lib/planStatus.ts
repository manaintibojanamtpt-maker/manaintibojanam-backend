import { PLAN_TRIALS, growthOnboardingTrialExpiresAt } from '../config/pricing';
import { getDb } from './firebase-db';
import { doc, updateDoc } from 'firebase/firestore';

type TenantPlanSnapshot = {
  subscription?: {
    planId?: string;
    status?: string;
    trialExpiresAt?: string;
    trialType?: string;
    onboardingTrial?: boolean;
    trialUsed?: boolean;
  };
  storeStatus?: string;
  sandboxMode?: boolean;
  onboardingStatus?: {
    isComplete?: boolean;
    migrated?: boolean;
  };
};

export function isTrialCurrentlyActive(tenant: TenantPlanSnapshot | null | undefined): boolean {
  const expiresAt = tenant?.subscription?.trialExpiresAt;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

export function isOnGrowthOnboardingTrial(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant || !isTrialCurrentlyActive(tenant)) return false;
  const sub = tenant.subscription;
  if (sub?.onboardingTrial) return true;
  if (sub?.trialType === 'growth') return true;
  return sub?.planId === 'growth' && sub?.status === 'trialing';
}

/** Plan id used for UI (handles growth trial even if planId not synced yet) */
export function getEffectivePlanId(tenant: TenantPlanSnapshot | null | undefined): string {
  if (!tenant) return 'starter';
  const planId = tenant.subscription?.planId || 'starter';
  if (planId !== 'starter') return planId;
  if (isOnGrowthOnboardingTrial(tenant)) return 'growth';
  return planId;
}

export function getOwnerPlanActionLabel(
  planId: string,
  planName: string,
  ownerCta: string,
  tenant: TenantPlanSnapshot | null | undefined
): string {
  const effectivePlanId = getEffectivePlanId(tenant);
  const sub = tenant?.subscription;

  if (planId === effectivePlanId) {
    if (isTrialCurrentlyActive(tenant) && isOnGrowthOnboardingTrial(tenant) && planId === 'growth') {
      return 'Current plan (14-day trial)';
    }
    if (isTrialCurrentlyActive(tenant)) {
      return 'Current plan (trial active)';
    }
    return 'Current plan';
  }

  if (effectivePlanId !== 'starter') {
    return ownerCta;
  }

  if (planId === 'growth' && !sub?.trialUsed) {
    return `Start ${PLAN_TRIALS.growthOnboardingDays}-day free trial`;
  }

  if (!sub?.trialUsed && planId === 'pro') {
    return `Try ${planName} — ${PLAN_TRIALS.paidUpgradeDays} days free`;
  }

  return ownerCta;
}

export function getOwnerTrialNote(
  planId: string,
  tenant: TenantPlanSnapshot | null | undefined,
  defaultNote?: string
): string | undefined {
  const effectivePlanId = getEffectivePlanId(tenant);

  if (planId === 'growth' && effectivePlanId === 'growth' && isOnGrowthOnboardingTrial(tenant)) {
    return `${PLAN_TRIALS.growthOnboardingDays}-day Growth trial active`;
  }

  if (planId === 'growth' && effectivePlanId === 'starter') {
    return `${PLAN_TRIALS.growthOnboardingDays}-day free trial when you go live`;
  }

  if (planId === 'pro' && effectivePlanId === 'starter' && !tenant?.subscription?.trialUsed) {
    return `${PLAN_TRIALS.paidUpgradeDays}-day trial when upgrading from free`;
  }

  return defaultNote;
}

export function hasActiveGrowthAccess(tenant: TenantPlanSnapshot | null | undefined): boolean {
  if (!tenant) return false;
  const planId = tenant.subscription?.planId || 'starter';
  if (planId === 'starter') return false;
  if (tenant.subscription?.status === 'trialing' && tenant.subscription.trialExpiresAt) {
    return new Date(tenant.subscription.trialExpiresAt).getTime() > Date.now();
  }
  return ['growth', 'pro', 'enterprise'].includes(planId);
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

export function growthTrialDaysRemaining(tenant: TenantPlanSnapshot | null | undefined): number | null {
  const expiresAt = tenant?.subscription?.trialExpiresAt;
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function freeStorefrontBannerDismissKey(tenantSlug: string): string {
  return `bhojanos_free_storefront_banner_${tenantSlug}`;
}

export function buildGrowthOnboardingTrialPatch() {
  const trialExpiresAt = growthOnboardingTrialExpiresAt();
  return {
    storeStatus: 'active',
    status: 'trialing',
    trialEndsAt: trialExpiresAt,
    subscription: {
      planId: 'growth' as const,
      status: 'trialing' as const,
      trialActivatedAt: new Date().toISOString(),
      trialExpiresAt,
      trialType: 'growth' as const,
      onboardingTrial: true,
    },
  };
}

export async function activateGrowthOnboardingTrial(tenantDocId: string): Promise<void> {
  const trialExpiresAt = growthOnboardingTrialExpiresAt();
  const db = getDb();
  await updateDoc(doc(db, 'tenants', tenantDocId), {
    storeStatus: 'active',
    status: 'trialing',
    trialEndsAt: trialExpiresAt,
    'subscription.planId': 'growth',
    'subscription.status': 'trialing',
    'subscription.trialActivatedAt': new Date().toISOString(),
    'subscription.trialExpiresAt': trialExpiresAt,
    'subscription.trialType': 'growth',
    'subscription.onboardingTrial': true,
  });
}

export { PLAN_TRIALS };


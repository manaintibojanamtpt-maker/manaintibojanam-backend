/**
 * Canonical Entitlement & Plan Taxonomy
 * SINGLE SOURCE OF TRUTH for all plan hierarchy, entitlements, trial rules, and upgrade paths.
 *
 * This replaces the duplicate matrices in:
 * - backend-lib/entitlements.ts
 * - src/lib/entitlements.ts
 */

import type { Firestore } from 'firebase-admin/firestore';

/** ──────────────────────────────────────────────
 * 1. PLAN HIERARCHY & TAXONOMY
 * ────────────────────────────────────────────── */

export type PlanId = 'starter' | 'growth' | 'pro' | 'enterprise';
export type PaidPlanId = Exclude<PlanId, 'starter'>;

export const PLAN_HIERARCHY: Record<PlanId, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
  enterprise: 3,
};

export const PLAN_DISPLAY: Record<PlanId, { name: string; priceLabel: string; period: string }> = {
  starter: { name: 'Direct Storefront', priceLabel: '₹0', period: 'forever · build & preview' },
  growth: { name: 'Growth', priceLabel: '₹999', period: '/ month' },
  pro: { name: 'Pro', priceLabel: '₹2,999', period: '/ month' },
  enterprise: { name: 'Enterprise', priceLabel: '₹4,999', period: '/ month' },
};

/** ──────────────────────────────────────────────
 * 2. CANONICAL ENTITLEMENT MATRIX
 * ────────────────────────────────────────────── */

export type FeatureKey =
  | 'storefront'
  | 'directOrders'
  | 'basicAnalytics'
  | 'advancedAnalytics'
  | 'inventory'
  | 'marketingTools'
  | 'aiCore'
  | 'aiFull'
  | 'deliveryEngine'
  | 'customerMemory'
  | 'customIntegrations';

/**
 * Canonical entitlement matrix — single source of truth.
 * All entitlement checks MUST use this matrix.
 */
export const CANONICAL_ENTITLEMENT_MATRIX: Record<PlanId, FeatureKey[]> = {
  starter: ['storefront', 'directOrders', 'basicAnalytics'],
  growth: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore'],
  pro: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore', 'aiFull', 'deliveryEngine', 'customerMemory'],
  enterprise: ['storefront', 'directOrders', 'basicAnalytics', 'advancedAnalytics', 'inventory', 'marketingTools', 'aiCore', 'aiFull', 'deliveryEngine', 'customerMemory', 'customIntegrations'],
};

/** ──────────────────────────────────────────────
 * 3. TRIAL RULES & GRACE PERIODS
 * ────────────────────────────────────────────── */

export const TRIAL_RULES = {
  /** 14-day Growth trial when kitchen first publishes/goes live */
  growthOnboardingDays: 14,

  /** 3-day trial when upgrading from starter to a paid plan */
  paidUpgradeDays: 3,

  /** Grace period after trial expires (before suspension/downgrade) */
  gracePeriodDays: 3,

  /** Maximum days for superadmin extendTrial action */
  maxExtendTrialDays: 90,
} as const;

/** Trial types for audit trail */
export type TrialType = 'growth_onboarding' | 'paid_upgrade' | 'superadmin_extended';

export interface TrialState {
  isActive: boolean;
  type: TrialType | null;
  planId: PaidPlanId | null;
  activatedAt: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  inGracePeriod: boolean;
  graceDaysRemaining: number | null;
}

/** ──────────────────────────────────────────────
 * 4. SUBSCRIPTION STATE MACHINE
 * ────────────────────────────────────────────── */

export type SubscriptionStatus =
  | 'none'           // No subscription record
  | 'trialing'       // Active trial (onboarding or upgrade)
  | 'active'         // Paid, current
  | 'past_due'       // Payment failed, in retry window
  | 'canceled'       // Explicitly canceled (awaiting period end)
  | 'paused'         // Manually paused (superadmin)
  | 'expired';       // Trial ended without payment / period ended

export type SubscriptionState = {
  planId: PlanId;
  status: SubscriptionStatus;
  trialState: TrialState;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paidActivatedAt: string | null;
  trialUsed: boolean;
  founderOverride: boolean;
  founderOverrideDetails?: {
    action: 'extendTrial' | 'grantPlan' | 'bypassExpiry';
    by: string;
    at: string;
  };
  /** Razorpay subscription ID for recurring billing */
  razorpaySubscriptionId?: string;
  /** Last invoice payment attempt */
  lastInvoiceAttemptAt?: string;
  /** Next billing attempt for past_due */
  nextBillingAttemptAt?: string;
  /** Number of failed payment attempts in current cycle */
  failedPaymentAttempts?: number;
};

/** Valid status transitions */
export const VALID_STATUS_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  none: ['trialing', 'active'],
  trialing: ['active', 'expired', 'canceled'],
  active: ['past_due', 'canceled', 'paused'],
  past_due: ['active', 'canceled', 'expired'],
  canceled: ['active', 'trialing'], // Resubscribe
  paused: ['active', 'canceled'],
  expired: ['trialing', 'active'],  // Can restart trial or pay
};

/** Billing cycle constants */
export const BILLING_CYCLE = {
  /** Monthly billing interval in milliseconds */
  MONTHLY_MS: 30 * 24 * 60 * 60 * 1000,
  /** Max failed payment attempts before canceling */
  MAX_FAILED_ATTEMPTS: 3,
  /** Retry intervals in hours: 1h, 6h, 24h */
  RETRY_INTERVALS_HOURS: [1, 6, 24],
  /** Grace period after period ends before past_due */
  GRACE_PERIOD_HOURS: 24,
} as const;

/**
 * Compute next billing period dates
 */
export function computeNextBillingPeriod(from: Date = new Date()): { start: string; end: string } {
  const start = new Date(from);
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Check if subscription is in a billable state
 */
export function isBillableStatus(status: SubscriptionStatus): boolean {
  return ['active', 'past_due', 'trialing'].includes(status);
}

/**
 * Determine if subscription needs renewal (period ended)
 */
export function isPeriodEnded(tenantData: Record<string, unknown>): boolean {
  const subscription = (tenantData.subscription ?? {}) as Record<string, unknown>;
  const currentPeriodEnd = subscription.currentPeriodEnd as string | undefined;
  if (!currentPeriodEnd) return false;
  return new Date(currentPeriodEnd).getTime() <= Date.now();
}

/**
 * Determine next state after period ends
 */
export function computeRenewalState(
  currentState: SubscriptionState,
  paymentSuccess: boolean
): SubscriptionStatus {
  if (!paymentSuccess) {
    if (currentState.failedPaymentAttempts !== undefined &&
        currentState.failedPaymentAttempts >= BILLING_CYCLE.MAX_FAILED_ATTEMPTS - 1) {
      return 'canceled';
    }
    return 'past_due';
  }

  // If canceled at period end, don't renew
  if (currentState.cancelAtPeriodEnd) {
    return 'canceled';
  }

  return 'active';
}

/** ──────────────────────────────────────────────
 * 5. UPGRADE/DOWNGRADE RULES
 * ────────────────────────────────────────────── */

export interface UpgradePath {
  from: PlanId;
  to: PlanId;
  requiresPayment: boolean;
  trialAvailable: boolean;
  trialDays: number;
  prorationBehavior: 'immediate' | 'next_cycle';
}

export const UPGRADE_PATHS: UpgradePath[] = [
  // Starter → Growth (onboarding trial when publishing)
  { from: 'starter', to: 'growth', requiresPayment: false, trialAvailable: true, trialDays: TRIAL_RULES.growthOnboardingDays, prorationBehavior: 'immediate' },

  // Starter → Growth/Pro (paid upgrade trial)
  { from: 'starter', to: 'growth', requiresPayment: true, trialAvailable: true, trialDays: TRIAL_RULES.paidUpgradeDays, prorationBehavior: 'immediate' },
  { from: 'starter', to: 'pro', requiresPayment: true, trialAvailable: true, trialDays: TRIAL_RULES.paidUpgradeDays, prorationBehavior: 'immediate' },

  // Growth → Pro (paid upgrade trial if trial not used)
  { from: 'growth', to: 'pro', requiresPayment: true, trialAvailable: true, trialDays: TRIAL_RULES.paidUpgradeDays, prorationBehavior: 'immediate' },

  // Any paid → Enterprise (no trial, immediate)
  { from: 'growth', to: 'enterprise', requiresPayment: true, trialAvailable: false, trialDays: 0, prorationBehavior: 'immediate' },
  { from: 'pro', to: 'enterprise', requiresPayment: true, trialAvailable: false, trialDays: 0, prorationBehavior: 'immediate' },

  // Downgrades (always next cycle, no trial)
  { from: 'enterprise', to: 'pro', requiresPayment: false, trialAvailable: false, trialDays: 0, prorationBehavior: 'next_cycle' },
  { from: 'enterprise', to: 'growth', requiresPayment: false, trialAvailable: false, trialDays: 0, prorationBehavior: 'next_cycle' },
  { from: 'pro', to: 'growth', requiresPayment: false, trialAvailable: false, trialDays: 0, prorationBehavior: 'next_cycle' },
  { from: 'growth', to: 'starter', requiresPayment: false, trialAvailable: false, trialDays: 0, prorationBehavior: 'next_cycle' },
  { from: 'pro', to: 'starter', requiresPayment: false, trialAvailable: false, trialDays: 0, prorationBehavior: 'next_cycle' },
  { from: 'enterprise', to: 'starter', requiresPayment: false, trialAvailable: false, trialDays: 0, prorationBehavior: 'next_cycle' },
];

/** Get upgrade path or throw */
export function getUpgradePath(from: PlanId, to: PlanId): UpgradePath {
  const path = UPGRADE_PATHS.find(p => p.from === from && p.to === to);
  if (!path) {
    throw new Error(`No valid upgrade path from ${from} to ${to}`);
  }
  return path;
}

/** ──────────────────────────────────────────────
 * 6. CORE UTILITY FUNCTIONS
 * ────────────────────────────────────────────── */

/**
 * Check if a plan has a feature entitlement.
 * Throws with statusCode 403 if not entitled (for middleware use).
 */
export function assertEntitlement(
  planId: PlanId | string | null | undefined,
  featureKey: FeatureKey
): PlanId {
  const effectivePlanId: PlanId = (planId && PLAN_HIERARCHY[planId as PlanId] != null)
    ? (planId as PlanId)
    : 'starter';

  const allowedFeatures = CANONICAL_ENTITLEMENT_MATRIX[effectivePlanId] || [];

  if (!allowedFeatures.includes(featureKey)) {
    const err: any = new Error(
      `Your current plan (${effectivePlanId}) does not support ${featureKey}. Please upgrade to access this feature.`
    );
    err.statusCode = 403;
    err.requiresUpgrade = true;
    err.currentPlan = effectivePlanId;
    err.requiredFeature = featureKey;
    throw err;
  }

  return effectivePlanId;
}

/**
 * Non-throwing entitlement check (for UI logic).
 */
export function hasEntitlement(
  planId: PlanId | string | null | undefined,
  featureKey: FeatureKey
): boolean {
  const effectivePlanId: PlanId = (planId && PLAN_HIERARCHY[planId as PlanId] != null)
    ? (planId as PlanId)
    : 'starter';
  const allowedFeatures = CANONICAL_ENTITLEMENT_MATRIX[effectivePlanId] || [];
  return allowedFeatures.includes(featureKey);
}

/**
 * Compute trial state from tenant subscription data.
 */
export function computeTrialState(subscription: Record<string, unknown> | null | undefined): TrialState {
  if (!subscription) {
    return {
      isActive: false,
      type: null,
      planId: null,
      activatedAt: null,
      expiresAt: null,
      daysRemaining: null,
      inGracePeriod: false,
      graceDaysRemaining: null,
    };
  }

  const trialExpiresAt = subscription.trialExpiresAt as string | undefined;
  const trialType = subscription.trialType as TrialType | undefined;
  const status = subscription.status as string | undefined;
  const planId = subscription.planId as PaidPlanId | undefined;

  if (!trialExpiresAt || status !== 'trialing') {
    return {
      isActive: false,
      type: null,
      planId: null,
      activatedAt: subscription.trialActivatedAt as string | null,
      expiresAt: trialExpiresAt || null,
      daysRemaining: null,
      inGracePeriod: false,
      graceDaysRemaining: null,
    };
  }

  const now = Date.now();
  const expiresAt = new Date(trialExpiresAt).getTime();
  const activatedAt = subscription.trialActivatedAt
    ? new Date(subscription.trialActivatedAt as string).getTime()
    : null;

  const daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
  const isActive = now < expiresAt;

  // Grace period: 3 days after trial expires
  const graceEndsAt = expiresAt + (TRIAL_RULES.gracePeriodDays * 24 * 60 * 60 * 1000);
  const inGracePeriod = !isActive && now <= graceEndsAt;
  const graceDaysRemaining = inGracePeriod
    ? Math.max(0, Math.ceil((graceEndsAt - now) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    isActive,
    type: trialType || (planId === 'growth' && subscription.onboardingTrial ? 'growth_onboarding' : 'paid_upgrade'),
    planId: planId || null,
    activatedAt: subscription.trialActivatedAt as string | null,
    expiresAt: trialExpiresAt,
    daysRemaining: isActive ? daysRemaining : 0,
    inGracePeriod,
    graceDaysRemaining,
  };
}

/**
 * Compute full subscription state from tenant document.
 */
export function computeSubscriptionState(tenantData: Record<string, unknown>): SubscriptionState {
  const subscription = (tenantData.subscription ?? {}) as Record<string, unknown>;
  const trialState = computeTrialState(subscription);

  let status: SubscriptionStatus = 'none';
  const planId = (subscription.planId as PlanId) || 'starter';

  if (subscription.founderOverride === true) {
    // Founder override always shows as active for entitlement purposes
    status = 'active';
  } else if (trialState.isActive) {
    status = 'trialing';
  } else if (subscription.status === 'active') {
    status = 'active';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'canceled') {
    status = 'canceled';
  } else if (subscription.status === 'paused') {
    status = 'paused';
  } else if (trialState.inGracePeriod) {
    status = 'trialing'; // Still in grace period
  } else if (subscription.trialUsed === true || subscription.status === 'expired') {
    status = 'expired';
  }

  return {
    planId,
    status,
    trialState,
    currentPeriodStart: subscription.currentPeriodStart as string | null,
    currentPeriodEnd: subscription.currentPeriodEnd as string | null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd === true,
    paidActivatedAt: subscription.paidActivatedAt as string | null,
    trialUsed: subscription.trialUsed === true,
    founderOverride: subscription.founderOverride === true,
    founderOverrideDetails: subscription.founderOverride ? {
      action: subscription.founderOverrideAction as 'extendTrial' | 'grantPlan' | 'bypassExpiry',
      by: subscription.founderOverrideBy as string,
      at: subscription.founderOverrideAt as string,
    } : undefined,
  };
}

/**
 * Check if upgrade requires payment (for UI flow control).
 */
export function upgradeRequiresPayment(
  currentState: SubscriptionState,
  targetPlanId: PlanId
): boolean {
  if (targetPlanId === 'starter') return false;
  if (targetPlanId === 'enterprise') return true; // Enterprise always requires contact/sales

  const path = UPGRADE_PATHS.find(p => p.from === currentState.planId && p.to === targetPlanId);
  if (!path) return true; // Default to requiring payment for unknown paths

  // If current plan has active trial and we're staying on same plan, no payment
  if (currentState.trialState.isActive && currentState.planId === targetPlanId) {
    return false;
  }

  // If current plan has active growth onboarding trial and target is growth, no payment
  if (currentState.trialState.type === 'growth_onboarding' && targetPlanId === 'growth') {
    return false;
  }

  // If trial not used and upgrading from starter to growth/pro, trial available
  if (currentState.planId === 'starter' && !currentState.trialUsed &&
      (targetPlanId === 'growth' || targetPlanId === 'pro')) {
    return false; // Trial will be applied
  }

  // If trial expired or used, payment required
  if (currentState.trialUsed || currentState.trialState.type === null && currentState.status !== 'trialing') {
    return path.requiresPayment;
  }

  return path.requiresPayment;
}

/** ──────────────────────────────────────────────
 * 7. SUPER ADMIN OVERRIDE VALIDATION
 * ────────────────────────────────────────────── */

export type SuperAdminAction = 'extendTrial' | 'grantPlan' | 'bypassExpiry';

export interface SuperAdminOverrideInput {
  action: SuperAdminAction;
  tenantId: string;
  planId?: PaidPlanId; // Required for grantPlan
  days?: number;       // Required for extendTrial, optional for bypassExpiry
}

export function validateSuperAdminOverride(input: SuperAdminOverrideInput): { valid: boolean; error?: string } {
  switch (input.action) {
    case 'extendTrial':
      if (!input.days || input.days < 1 || input.days > TRIAL_RULES.maxExtendTrialDays) {
        return { valid: false, error: `days must be between 1 and ${TRIAL_RULES.maxExtendTrialDays}` };
      }
      break;
    case 'grantPlan':
      if (!input.planId || !['growth', 'pro', 'enterprise'].includes(input.planId)) {
        return { valid: false, error: 'planId must be growth, pro, or enterprise' };
      }
      break;
    case 'bypassExpiry':
      if (input.days !== undefined && (input.days < 1 || input.days > TRIAL_RULES.maxExtendTrialDays)) {
        return { valid: false, error: `days must be between 1 and ${TRIAL_RULES.maxExtendTrialDays}` };
      }
      break;
    default:
      return { valid: false, error: 'Invalid action' };
  }
  return { valid: true };
}

/** ──────────────────────────────────────────────
 * 8. SERVER-SIDE ENTITLEMENT MIDDLEWARE
 * ────────────────────────────────────────────── */

export function requireEntitlement(db: Firestore, featureKey: FeatureKey) {
  return async (req: any, res: any, next: any) => {
    try {
      const tenantId = req.tenantId || req.params.tenantId || req.body?.tenantId || req.query?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'tenantId is required for entitlement check'
        });
      }

      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenantData = tenantDoc.data()!;
      const subscriptionState = computeSubscriptionState(tenantData);

      assertEntitlement(subscriptionState.planId, featureKey);
      next();
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message || 'Entitlement check failed',
          requiresUpgrade: error.requiresUpgrade,
          currentPlan: error.currentPlan,
          requiredFeature: error.requiredFeature,
        });
      }
      console.error('requireEntitlement error:', error);
      res.status(500).json({ success: false, error: 'Internal server error checking entitlements' });
    }
  };
}

/** ──────────────────────────────────────────────
 * 9. EXPORT CANONICAL TYPES (for frontend alignment)
 * ────────────────────────────────────────────── */

export type {
  PlanId,
  PaidPlanId,
  FeatureKey,
  SubscriptionStatus,
  SubscriptionState,
  TrialState,
  TrialType,
  UpgradePath,
  SuperAdminAction,
  SuperAdminOverrideInput,
};
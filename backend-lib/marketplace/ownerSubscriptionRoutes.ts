import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  type PlanId,
  type PaidPlanId,
  type SubscriptionState,
  type SubscriptionStatus,
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
} from '../canonicalEntitlements.js';
import { subscriptionRateLimiters } from '../shared/subscriptionRateLimiting.js';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

type RazorpayDeps = {
  razorpay: {
    orders: { create: (options: Record<string, unknown>) => Promise<{ id: string; amount: number; currency: string }> };
    subscriptions?: {
      create: (options: Record<string, unknown>) => Promise<{ id: string; status: string; plan_id: string; customer_id?: string; start_at?: number; total_count?: number }>;
      fetch: (subscriptionId: string) => Promise<any>;
    };
  } | null;
  isRazorpayConfigured: boolean;
  razorpayKeyId: string;
  verifyRazorpaySignature: (orderId: string, paymentId: string, signature: string) => boolean;
};

const OWNER_SAAS_PLAN_PRICES: Record<PaidPlanId, number> = {
  growth: 999,
  pro: 2999,
  enterprise: 4999,
};

function buildPaidSubscriptionPatch(planId: PaidPlanId, payment?: { orderId: string; paymentId: string }) {
  const now = new Date().toISOString();
  const subscription: Record<string, unknown> = {
    planId,
    status: 'active',
    trialUsed: true,
    paidActivatedAt: now,
    currentPeriodStart: now,
    currentPeriodEnd: planId === 'enterprise' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
  };
  if (payment) {
    subscription.razorpayOrderId = payment.orderId;
    subscription.razorpayPaymentId = payment.paymentId;
  }
  return {
    status: 'active',
    storeStatus: 'active',
    subscription,
  };
}

function buildTrialSubscriptionPatch(planId: PaidPlanId, trialType: TrialType, trialDays: number) {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + trialDays);
  const trialExpiresIso = expiresAt.toISOString();

  const subscription: Record<string, unknown> = {
    planId,
    status: 'trialing',
    trialActivatedAt: now.toISOString(),
    trialExpiresAt: trialExpiresIso,
    trialType,
    trialUsed: trialType === 'paid_upgrade', // Only mark trialUsed for paid upgrade trials
  };

  return {
    status: 'trialing',
    storeStatus: 'active',
    trialEndsAt: trialExpiresIso,
    subscription,
  };
}

export function registerOwnerSubscriptionRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
  razorpayDeps?: RazorpayDeps,
): void {
  // PUT /api/owner/subscription/plan - Upgrade/downgrade plan (with trial logic)
  app.put('/api/owner/subscription/plan', verifyFirebaseToken, subscriptionRateLimiters.planChange, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const planId = typeof req.body?.planId === 'string' ? req.body.planId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      // Validate plan
      const validPlans: PlanId[] = ['starter', 'growth', 'pro', 'enterprise'];
      if (!validPlans.includes(planId as PlanId)) {
        return res.status(400).json({ success: false, error: 'Invalid plan id' });
      }

      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);

      // No change
      if (planId === currentState.planId && currentState.status === 'active') {
        return res.json({ success: true, tenantId: resolvedTenantId, planId, unchanged: true });
      }

      // Get upgrade path
      let upgradePath;
      try {
        upgradePath = getUpgradePath(currentState.planId, planId as PlanId);
      } catch {
        return res.status(400).json({ success: false, error: `No valid upgrade path from ${currentState.planId} to ${planId}` });
      }

      const patch: Record<string, unknown> = { updatedAt: fieldValue.serverTimestamp() };

      // Enterprise always requires payment/contact
      if (planId === 'enterprise') {
        return res.status(402).json({
          success: false,
          error: 'Enterprise plan requires sales contact. Please reach out to our team.',
          requiresPayment: true,
          requiresContact: true,
        });
      }

      // Check if payment required
      const requiresPayment = upgradeRequiresPayment(currentState, planId as PlanId);

      if (requiresPayment) {
        return res.status(402).json({
          success: false,
          error: 'Payment required. Use subscription checkout to upgrade.',
          requiresPayment: true,
          upgradePath: {
            from: currentState.planId,
            to: planId,
            amount: OWNER_SAAS_PLAN_PRICES[planId as PaidPlanId],
          },
        });
      }

      // Apply trial or immediate activation
      if (upgradePath.trialAvailable && upgradePath.trialDays > 0) {
        const trialPatch = buildTrialSubscriptionPatch(planId as PaidPlanId, upgradePath.trialDays === TRIAL_RULES.growthOnboardingDays ? 'growth_onboarding' : 'paid_upgrade', upgradePath.trialDays);
        Object.assign(patch, trialPatch);
      } else {
        // Immediate activation (downgrades or no-trial upgrades)
        const paidPatch = buildPaidSubscriptionPatch(planId as PaidPlanId);
        Object.assign(patch, paidPatch);
      }

      await db.collection('tenants').doc(resolvedTenantId).set(patch, { merge: true });
      res.json({ success: true, tenantId: resolvedTenantId, planId, trialApplied: upgradePath.trialAvailable });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update subscription plan',
      });
    }
  });

  // POST /api/owner/subscription/checkout - Create Razorpay subscription for recurring billing
  app.post('/api/owner/subscription/checkout', verifyFirebaseToken, subscriptionRateLimiters.checkout, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const planId = typeof req.body?.planId === 'string' ? req.body.planId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      // Validate plan - only paid plans (not enterprise)
      const validPaidPlans: PaidPlanId[] = ['growth', 'pro'];
      if (!validPaidPlans.includes(planId as PaidPlanId)) {
        return res.status(400).json({ success: false, error: 'Invalid plan for checkout. Enterprise requires sales contact.' });
      }

      // Get current state to validate
      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);

      // Validate upgrade path
      try {
        getUpgradePath(currentState.planId, planId as PlanId);
      } catch {
        return res.status(400).json({ success: false, error: `No valid upgrade path from ${currentState.planId} to ${planId}` });
      }

      const amount = OWNER_SAAS_PLAN_PRICES[planId as PaidPlanId];
      if (!amount) {
        return res.status(400).json({ success: false, error: 'Plan price not configured' });
      }

      if (!razorpayDeps?.isRazorpayConfigured || !razorpayDeps.razorpay) {
        if (process.env.NODE_ENV !== 'production') {
          return res.json({
            success: true,
            isMock: true,
            order: {
              id: `mock_owner_saas_${Date.now()}`,
              amount: Math.round(amount * 100),
              currency: 'INR',
            },
          });
        }
        return res.status(500).json({
          success: false,
          error: 'Razorpay is not configured. Please contact support.',
        });
      }

      // Try creating recurring subscription first; fall back to 1-time monthly order
      try {
        if (razorpayDeps.razorpay.subscriptions && razorpayDeps.razorpay.plans) {
          const razorpayPlanId = `bhojanos_${planId}_monthly`;
          let plan;
          try {
            plan = await razorpayDeps.razorpay.plans.fetch(razorpayPlanId);
          } catch (e: any) {
            if (e.error?.code === 'BAD_REQUEST_ERROR' && e.error?.description?.includes('not found')) {
              plan = await razorpayDeps.razorpay.plans.create({
                period: 'monthly',
                interval: 1,
                item: {
                  name: `BhojanOS ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
                  amount: Math.round(amount * 100),
                  currency: 'INR',
                  description: `Monthly subscription for BhojanOS ${planId} plan`,
                },
                notes: { bhojanos_plan: planId },
              });
            } else {
              throw e;
            }
          }

          let customerId: string | undefined;
          const existingCustomerId = tenant.subscription?.razorpayCustomerId as string | undefined;
          if (existingCustomerId) {
            try {
              await razorpayDeps.razorpay.customers.fetch(existingCustomerId);
              customerId = existingCustomerId;
            } catch {
              // Customer not found, fallback to creation
            }
          }

          if (!customerId) {
            const customer = await razorpayDeps.razorpay.customers.create({
              name: req.user.displayName || tenant.name || 'BhojanOS Customer',
              email: req.user.email || tenant.contact?.email,
              contact: tenant.kyc?.mobileNumber || tenant.contact?.phone,
              notes: { tenantId: resolvedTenantId, ownerUid: req.user.uid },
            });
            customerId = customer.id;
            await db.collection('tenants').doc(resolvedTenantId).set({
              subscription: { razorpayCustomerId: customerId },
            }, { merge: true });
          }

          const subscription = await razorpayDeps.razorpay.subscriptions.create({
            plan_id: plan.id,
            customer_id: customerId,
            total_count: 0,
            quantity: 1,
            start_at: Math.floor(Date.now() / 1000) + 60,
            notes: {
              type: 'owner_saas',
              tenantId: resolvedTenantId,
              planId,
              ownerUid: req.user.uid,
            },
            addons: [],
          });

          return res.json({
            success: true,
            subscription,
            key: razorpayDeps.razorpayKeyId,
            planId: plan.id,
          });
        }
      } catch (subErr) {
        console.warn('[Razorpay] Subscription creation failed, falling back to Order checkout', subErr);
      }

      // Fallback to Razorpay Order creation (instant monthly plan activation)
      const order = await razorpayDeps.razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `receipt_saas_${resolvedTenantId.slice(0, 8)}_${Date.now()}`,
        notes: {
          type: 'owner_saas',
          tenantId: resolvedTenantId,
          planId,
          ownerUid: req.user.uid,
        },
      });

      // Return both order and subscription fields so client knows the checkout type
      // Use order as fallback subscription when subscription creation failed
      subscription.id = order.id;
      subscription.amount = order.amount;
      subscription.currency = order.currency;

      return res.json({
        success: true,
        subscription,
        key: razorpayDeps.razorpayKeyId,
        planId,
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      });
    }
  });

  // POST /api/owner/subscription/confirm-payment - Verify Razorpay subscription or order payment and activate subscription
  app.post('/api/owner/subscription/confirm-payment', verifyFirebaseToken, subscriptionRateLimiters.confirmPayment, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const planId = typeof req.body?.planId === 'string' ? req.body.planId.trim() : '';
      const orderId = typeof req.body?.razorpay_order_id === 'string' ? req.body.razorpay_order_id.trim() : '';
      const subscriptionId = typeof req.body?.razorpay_subscription_id === 'string' ? req.body.razorpay_subscription_id.trim() : '';
      const paymentId = typeof req.body?.razorpay_payment_id === 'string' ? req.body.razorpay_payment_id.trim() : '';
      const signature = typeof req.body?.razorpay_signature === 'string' ? req.body.razorpay_signature.trim() : '';
      const isMock = req.body?.isMock === true;

      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      // Validate plan - only growth/pro (enterprise requires sales contact)
      const validPaidPlans: PaidPlanId[] = ['growth', 'pro'];
      if (!validPaidPlans.includes(planId as PaidPlanId)) {
        return res.status(400).json({ success: false, error: 'Invalid plan id' });
      }

      // Get current state for validation
      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);

      // Validate upgrade path
      try {
        getUpgradePath(currentState.planId, planId as PlanId);
      } catch {
        return res.status(400).json({ success: false, error: `No valid upgrade path from ${currentState.planId} to ${planId}` });
      }

      const targetId = subscriptionId || orderId;

      if (!isMock) {
        if (!targetId || !paymentId || !signature) {
          return res.status(400).json({ success: false, error: 'Missing payment verification parameters' });
        }
        if (!razorpayDeps?.isRazorpayConfigured) {
          return res.status(500).json({ success: false, error: 'Razorpay is not configured for verification' });
        }
        // Verify Razorpay HMAC signature (works for order_id or subscription_id)
        const verified = razorpayDeps.verifyRazorpaySignature(targetId, paymentId, signature);
        if (!verified) {
          return res.status(400).json({ success: false, error: 'Payment signature verification failed' });
        }
      } else if (process.env.NODE_ENV === 'production') {
        return res.status(400).json({ success: false, error: 'Mock payments are not allowed in production' });
      }

      const paidPatch = buildPaidSubscriptionPatch(planId as PaidPlanId, isMock ? undefined : { orderId: targetId, paymentId });
      if (subscriptionId) {
        paidPatch.subscription.razorpaySubscriptionId = isMock ? `mock_sub_${Date.now()}` : subscriptionId;
      }
      paidPatch.subscription.razorpayPaymentId = paymentId;

      await db.collection('tenants').doc(resolvedTenantId).set(
        {
          ...paidPatch,
          updatedAt: fieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      // Add razorpaySubscriptionId to the patch
      paidPatch.subscription.razorpaySubscriptionId = isMock ? `mock_sub_${Date.now()}` : subscriptionId;
      paidPatch.subscription.razorpayPaymentId = paymentId;

      await db.collection('tenants').doc(resolvedTenantId).set(
        {
          ...paidPatch,
          updatedAt: fieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      res.json({ success: true, tenantId: resolvedTenantId, planId, razorpaySubscriptionId: subscriptionId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm subscription payment',
      });
    }
  });

  // POST /api/owner/activate-growth-trial - Explicit growth onboarding trial activation
  app.post('/api/owner/activate-growth-trial', verifyFirebaseToken, subscriptionRateLimiters.trialActivation, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);

      // Only allow from starter, only if trial not used
      if (currentState.planId !== 'starter' || currentState.trialUsed) {
        return res.status(400).json({ success: false, error: 'Growth onboarding trial not available' });
      }

      const trialPatch = buildTrialSubscriptionPatch('growth', 'growth_onboarding', TRIAL_RULES.growthOnboardingDays);
      await db.collection('tenants').doc(resolvedTenantId).set(
        {
          ...trialPatch,
          updatedAt: fieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      res.json({ success: true, tenantId: resolvedTenantId, planId: 'growth', trialDays: TRIAL_RULES.growthOnboardingDays });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate growth trial',
      });
    }
  });

  // POST /api/owner/subscription/cancel - Cancel subscription at period end
  app.post('/api/owner/subscription/cancel', verifyFirebaseToken, subscriptionRateLimiters.cancelResume, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);

      if (!isBillableStatus(currentState.status)) {
        return res.status(400).json({ success: false, error: 'No active subscription to cancel' });
      }

      // If already canceled, return current state
      if (currentState.cancelAtPeriodEnd) {
        return res.json({
          success: true,
          tenantId: resolvedTenantId,
          alreadyCanceled: true,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: currentState.currentPeriodEnd,
        });
      }

      const patch = {
        subscription: {
          cancelAtPeriodEnd: true,
        },
        updatedAt: fieldValue.serverTimestamp(),
      };

      await db.collection('tenants').doc(resolvedTenantId).set(patch, { merge: true });

      res.json({
        success: true,
        tenantId: resolvedTenantId,
        canceled: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: currentState.currentPeriodEnd,
        message: `Subscription will be canceled at period end (${currentState.currentPeriodEnd})`,
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      });
    }
  });

  // POST /api/owner/subscription/resume - Resume a canceled subscription
  app.post('/api/owner/subscription/resume', verifyFirebaseToken, subscriptionRateLimiters.cancelResume, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);

      if (currentState.status !== 'canceled' && !currentState.cancelAtPeriodEnd) {
        return res.status(400).json({ success: false, error: 'Subscription is not canceled' });
      }

      const now = new Date();
      const { start, end } = computeNextBillingPeriod(now);

      const patch = {
        status: 'active',
        storeStatus: 'active',
        subscription: {
          cancelAtPeriodEnd: false,
          currentPeriodStart: start,
          currentPeriodEnd: end,
          failedPaymentAttempts: 0,
        },
        updatedAt: fieldValue.serverTimestamp(),
      };

      await db.collection('tenants').doc(resolvedTenantId).set(patch, { merge: true });

      res.json({
        success: true,
        tenantId: resolvedTenantId,
        resumed: true,
        currentPeriodStart: start,
        currentPeriodEnd: end,
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume subscription',
      });
    }
  });

  // GET /api/owner/subscription/status - Get detailed subscription status
  app.get('/api/owner/subscription/status', verifyFirebaseToken, subscriptionRateLimiters.status, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);
      const trialState = computeTrialState(tenant.subscription as Record<string, unknown>);
      const isPeriodEnd = isPeriodEnded(tenant);

      res.json({
        success: true,
        tenantId: resolvedTenantId,
        subscription: {
          planId: currentState.planId,
          status: currentState.status,
          trialState: {
            isActive: trialState.isActive,
            type: trialState.type,
            planId: trialState.planId,
            expiresAt: trialState.expiresAt,
            daysRemaining: trialState.daysRemaining,
            inGracePeriod: trialState.inGracePeriod,
            graceDaysRemaining: trialState.graceDaysRemaining,
          },
          currentPeriodStart: currentState.currentPeriodStart,
          currentPeriodEnd: currentState.currentPeriodEnd,
          cancelAtPeriodEnd: currentState.cancelAtPeriodEnd,
          paidActivatedAt: currentState.paidActivatedAt,
          trialUsed: currentState.trialUsed,
          founderOverride: currentState.founderOverride,
          failedPaymentAttempts: currentState.failedPaymentAttempts || 0,
          nextBillingAttemptAt: currentState.nextBillingAttemptAt,
          razorpaySubscriptionId: currentState.razorpaySubscriptionId,
        },
        isPeriodEnd,
        willRenew: isBillableStatus(currentState.status) && !currentState.cancelAtPeriodEnd,
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get subscription status',
      });
    }
  });

  // POST /api/owner/subscription/billing-retry - Manual billing retry for past_due
  app.post('/api/owner/subscription/billing-retry', verifyFirebaseToken, subscriptionRateLimiters.billingRetry, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);

      if (currentState.status !== 'past_due') {
        return res.status(400).json({ success: false, error: 'Subscription is not past due' });
      }

      // Check if we have a Razorpay subscription ID for recurring billing
      if (!currentState.razorpaySubscriptionId) {
        // No recurring subscription - require manual payment
        return res.status(402).json({
          success: false,
          error: 'No recurring payment method on file. Please upgrade via checkout.',
          requiresCheckout: true,
        });
      }

      // For now, just trigger a webhook-style payment attempt
      // In production, this would call Razorpay to charge the subscription
      const attemptNumber = (currentState.failedPaymentAttempts || 0) + 1;
      const nextRetryHours = BILLING_CYCLE.RETRY_INTERVALS_HOURS[attemptNumber - 1] || 24;
      const nextRetryAt = new Date(Date.now() + nextRetryHours * 60 * 60 * 1000).toISOString();

      const patch = {
        subscription: {
          failedPaymentAttempts: attemptNumber,
          lastInvoiceAttemptAt: new Date().toISOString(),
          nextBillingAttemptAt,
        },
        updatedAt: fieldValue.serverTimestamp(),
      };

      await db.collection('tenants').doc(resolvedTenantId).set(patch, { merge: true });

      res.json({
        success: true,
        tenantId: resolvedTenantId,
        retryAttempted: true,
        attemptNumber,
        nextRetryAt,
        message: `Billing retry attempted. Next attempt in ${nextRetryHours} hours.`,
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry billing',
      });
    }
  });
}
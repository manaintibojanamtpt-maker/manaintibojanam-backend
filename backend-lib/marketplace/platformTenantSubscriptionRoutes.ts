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
  validateSuperAdminOverride,
  computeNextBillingPeriod,
  computeRenewalState,
  isBillableStatus,
  isPeriodEnded,
  BILLING_CYCLE,
  TRIAL_RULES,
  PLAN_HIERARCHY,
} from '../canonicalEntitlements.js';
import { subscriptionRateLimiters } from '../shared/subscriptionRateLimiting.js';

type RequireSuperadminFn = (req: Request, res: Response, next: () => void) => void | Promise<void>;

const VALID_GRANT_PLANS: PaidPlanId[] = ['growth', 'pro', 'enterprise'];

export function registerPlatformTenantSubscriptionRoutes(
  app: Express,
  db: Firestore,
  requireSuperadmin: RequireSuperadminFn,
  fieldValue: typeof FieldValue,
): void {
  app.post('/api/platform/tenant-subscription', requireSuperadmin, subscriptionRateLimiters.admin, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const action = typeof req.body?.action === 'string' ? req.body.action.trim() : '';

      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'tenantId is required' });
      }

      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);
      const patch: Record<string, unknown> = { updatedAt: fieldValue.serverTimestamp() };
      const actorEmail = (req.user?.email || 'superadmin').toLowerCase();
      const now = new Date().toISOString();

      // Validate the override action
      const validation = validateSuperAdminOverride({
        action: action as 'extendTrial' | 'grantPlan' | 'bypassExpiry',
        tenantId,
        planId: req.body?.planId,
        days: req.body?.days,
      });

      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }

      if (action === 'extendTrial') {
        const days = Number(req.body?.days);
        if (!Number.isFinite(days) || days < 1 || days > TRIAL_RULES.maxExtendTrialDays) {
          return res.status(400).json({ success: false, error: `days must be between 1 and ${TRIAL_RULES.maxExtendTrialDays}` });
        }

        const base = currentState.trialState.expiresAt
          ? new Date(currentState.trialState.expiresAt)
          : new Date();
        if (base.getTime() < Date.now()) {
          base.setTime(Date.now());
        }
        base.setDate(base.getDate() + days);
        const trialExpiresIso = base.toISOString();

        // Determine the plan for the trial - use current plan if it's a paid plan, otherwise growth
        const planId = (currentState.planId !== 'starter' ? currentState.planId : 'growth') as PaidPlanId;

        patch.status = 'trialing';
        patch.storeStatus = tenant.storeStatus === 'published' ? 'active' : tenant.storeStatus ?? 'active';
        patch.trialEndsAt = trialExpiresIso;
        patch.subscription = {
          ...tenant.subscription,
          planId,
          status: 'trialing',
          trialExpiresAt: trialExpiresIso,
          trialActivatedAt: now,
          trialType: 'superadmin_extended',
          founderOverride: true,
          founderOverrideAction: 'extendTrial',
          founderOverrideBy: actorEmail,
          founderOverrideAt: now,
        };

        await db.collection('tenants').doc(tenantId).set(patch, { merge: true });
        return res.json({
          success: true,
          tenantId,
          action,
          trialExpiresAt: trialExpiresIso,
          planId,
          trialDays: days,
        });
      }

      if (action === 'grantPlan') {
        const planId = typeof req.body?.planId === 'string' ? req.body.planId.trim() : 'growth';
        if (!VALID_GRANT_PLANS.includes(planId as PaidPlanId)) {
          return res.status(400).json({ success: false, error: 'Invalid planId. Must be growth, pro, or enterprise' });
        }

        // Can't grant a plan lower than current (use hierarchy)
        if (PLAN_HIERARCHY[planId] < PLAN_HIERARCHY[currentState.planId] && !currentState.founderOverride) {
          return res.status(400).json({
            success: false,
            error: `Cannot downgrade from ${currentState.planId} to ${planId} via grantPlan. Use bypassExpiry for temporary access or cancel first.`
          });
        }

        patch.status = 'active';
        patch.storeStatus = 'active';
        patch.subscription = {
          ...(tenant.subscription as Record<string, unknown> || {}),
          planId,
          status: 'active',
          trialUsed: true,
          founderGranted: true,
          founderOverride: true,
          founderOverrideAction: 'grantPlan',
          founderOverrideBy: actorEmail,
          founderOverrideAt: now,
          paidActivatedAt: now,
          currentPeriodStart: now,
          // Enterprise has no fixed period end; others monthly
          currentPeriodEnd: planId === 'enterprise' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };

        await db.collection('tenants').doc(tenantId).set(patch, { merge: true });
        return res.json({ success: true, tenantId, action, planId });
      }

      if (action === 'bypassExpiry') {
        const days = Number(req.body?.days) || 30;
        if (days < 1 || days > TRIAL_RULES.maxExtendTrialDays) {
          return res.status(400).json({ success: false, error: `days must be between 1 and ${TRIAL_RULES.maxExtendTrialDays}` });
        }

        const expires = new Date();
        expires.setDate(expires.getDate() + days);
        const trialExpiresIso = expires.toISOString();

        // Use current plan if paid, otherwise growth
        const planId = (currentState.planId !== 'starter' ? currentState.planId : 'growth') as PaidPlanId;

        patch.status = 'trialing';
        patch.storeStatus = 'active';
        patch.trialEndsAt = trialExpiresIso;
        patch.subscription = {
          ...tenant.subscription,
          planId,
          status: 'trialing',
          trialExpiresAt: trialExpiresIso,
          trialActivatedAt: now,
          trialType: 'superadmin_extended',
          founderOverride: true,
          founderBypassExpiry: true,
          founderOverrideAction: 'bypassExpiry',
          founderOverrideBy: actorEmail,
          founderOverrideAt: now,
        };

        await db.collection('tenants').doc(tenantId).set(patch, { merge: true });
        return res.json({
          success: true,
          tenantId,
          action,
          trialExpiresAt: trialExpiresIso,
          planId,
          days,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use extendTrial, grantPlan, or bypassExpiry.',
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tenant subscription',
      });
    }
  });

  // GET /api/platform/tenant-subscription/:tenantId - Get detailed subscription status (admin)
  app.get('/api/platform/tenant-subscription/:tenantId', requireSuperadmin, subscriptionRateLimiters.admin, async (req: any, res: Response) => {
    try {
      const tenantId = req.params.tenantId;
      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);
      const trialState = computeTrialState(tenant.subscription as Record<string, unknown>);
      const isPeriodEnd = isPeriodEnded(tenant);

      res.json({
        success: true,
        tenantId,
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
          founderOverrideDetails: currentState.founderOverrideDetails,
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

  // POST /api/platform/tenant-subscription/:tenantId/billing-retry - Manual billing retry (admin)
  app.post('/api/platform/tenant-subscription/:tenantId/billing-retry', requireSuperadmin, async (req: any, res: Response) => {
    try {
      const tenantId = req.params.tenantId;
      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);

      if (currentState.status !== 'past_due') {
        return res.status(400).json({ success: false, error: 'Subscription is not past due' });
      }

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

      await db.collection('tenants').doc(tenantId).set(patch, { merge: true });

      res.json({
        success: true,
        tenantId,
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

  // POST /api/platform/tenant-subscription/:tenantId/cancel - Cancel subscription (admin)
  app.post('/api/platform/tenant-subscription/:tenantId/cancel', requireSuperadmin, async (req: any, res: Response) => {
    try {
      const tenantId = req.params.tenantId;
      const immediate = req.body?.immediate === true;
      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const currentState = computeSubscriptionState(tenant);

      if (!isBillableStatus(currentState.status)) {
        return res.status(400).json({ success: false, error: 'No active subscription to cancel' });
      }

      let patch: Record<string, unknown>;
      if (immediate) {
        // Immediate cancellation - downgrade to starter
        patch = {
          status: 'canceled',
          storeStatus: 'active',
          trialEndsAt: fieldValue.delete(),
          subscription: {
            planId: 'starter',
            status: 'canceled',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: fieldValue.delete(),
            currentPeriodStart: fieldValue.delete(),
          },
        };
      } else {
        // Cancel at period end
        patch = {
          subscription: {
            cancelAtPeriodEnd: true,
          },
        };
      }

      await db.collection('tenants').doc(tenantId).set(
        { ...patch, updatedAt: fieldValue.serverTimestamp() },
        { merge: true }
      );

      res.json({ success: true, tenantId, immediate, canceled: true });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      });
    }
  });

  // POST /api/platform/tenant-subscription/:tenantId/set-plan - Force set plan (admin)
  app.post('/api/platform/tenant-subscription/:tenantId/set-plan', requireSuperadmin, async (req: any, res: Response) => {
    try {
      const tenantId = req.params.tenantId;
      const planId = typeof req.body?.planId === 'string' ? req.body.planId.trim() : '';
      const billingCycle = req.body?.billingCycle === 'monthly' ? 'monthly' : 'none';

      const validPlans: PlanId[] = ['starter', 'growth', 'pro', 'enterprise'];
      if (!validPlans.includes(planId as PlanId)) {
        return res.status(400).json({ success: false, error: 'Invalid planId' });
      }

      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const now = new Date();
      const patch: Record<string, unknown> = { updatedAt: fieldValue.serverTimestamp() };

      if (planId === 'starter') {
        patch.status = 'active';
        patch.storeStatus = 'active';
        patch.trialEndsAt = fieldValue.delete();
        patch.subscription = {
          planId: 'starter',
          status: 'active',
          trialUsed: true,
          cancelAtPeriodEnd: false,
          currentPeriodStart: fieldValue.delete(),
          currentPeriodEnd: fieldValue.delete(),
        };
      } else {
        const { start, end } = billingCycle === 'monthly' ? computeNextBillingPeriod(now) : { start: now.toISOString(), end: null as any };
        patch.status = 'active';
        patch.storeStatus = 'active';
        patch.trialEndsAt = fieldValue.delete();
        patch.subscription = {
          planId,
          status: 'active',
          trialUsed: true,
          paidActivatedAt: now.toISOString(),
          currentPeriodStart: start,
          currentPeriodEnd: end,
          cancelAtPeriodEnd: false,
          failedPaymentAttempts: 0,
        };
      }

      await db.collection('tenants').doc(tenantId).set(patch, { merge: true });
      res.json({ success: true, tenantId, planId, billingCycle });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set plan',
      });
    }
  });
}
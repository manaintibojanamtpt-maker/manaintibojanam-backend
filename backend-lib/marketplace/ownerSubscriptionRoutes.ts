import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

type RazorpayDeps = {
  razorpay: { orders: { create: (options: Record<string, unknown>) => Promise<{ id: string; amount: number; currency: string }> } } | null;
  isRazorpayConfigured: boolean;
  razorpayKeyId: string;
  verifyRazorpaySignature: (orderId: string, paymentId: string, signature: string) => boolean;
};

const PAID_UPGRADE_TRIAL_DAYS = 3;
const VALID_PAID_PLANS = new Set(['growth', 'pro', 'enterprise']);
const OWNER_SAAS_PLAN_PRICES: Record<string, number> = {
  growth: 999,
  pro: 2999,
};

function buildPaidSubscriptionPatch(planId: string, payment?: { orderId: string; paymentId: string }) {
  const now = new Date().toISOString();
  const subscription: Record<string, unknown> = {
    planId,
    status: 'active',
    trialUsed: true,
    paidActivatedAt: now,
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

export function registerOwnerSubscriptionRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
  razorpayDeps?: RazorpayDeps,
): void {
  app.put('/api/owner/subscription/plan', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const planId = typeof req.body?.planId === 'string' ? req.body.planId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      if (!VALID_PAID_PLANS.has(planId)) {
        return res.status(400).json({ success: false, error: 'Invalid plan id' });
      }

      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      const subscription = (tenant.subscription ?? {}) as Record<string, unknown>;
      const effectivePlanId = typeof subscription.planId === 'string' ? subscription.planId : 'starter';
      const trialUsed = subscription.trialUsed === true;

      if (planId === effectivePlanId && subscription.status === 'active') {
        return res.json({ success: true, tenantId: resolvedTenantId, planId, unchanged: true });
      }

      const patch: Record<string, unknown> = { updatedAt: fieldValue.serverTimestamp() };

      if (planId === 'growth' && effectivePlanId === 'starter' && !trialUsed) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);
        const trialExpiresIso = expiresAt.toISOString();
        patch.storeStatus = 'active';
        patch.status = 'trialing';
        patch.trialEndsAt = trialExpiresIso;
        patch.subscription = {
          planId: 'growth',
          status: 'trialing',
          trialActivatedAt: new Date().toISOString(),
          trialExpiresAt: trialExpiresIso,
          trialType: 'growth',
          onboardingTrial: true,
        };
      } else if (!trialUsed && effectivePlanId === 'starter') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + PAID_UPGRADE_TRIAL_DAYS);
        patch.subscription = {
          planId,
          status: 'trialing',
          trialActivatedAt: new Date().toISOString(),
          trialExpiresAt: expiresAt.toISOString(),
          trialUsed: true,
          trialType: planId,
        };
      } else {
        return res.status(402).json({
          success: false,
          error: 'Payment required. Use subscription checkout to upgrade.',
          requiresPayment: true,
        });
      }

      await db.collection('tenants').doc(resolvedTenantId).set(patch, { merge: true });
      res.json({ success: true, tenantId: resolvedTenantId, planId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update subscription plan',
      });
    }
  });

  app.post('/api/owner/subscription/checkout', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const planId = typeof req.body?.planId === 'string' ? req.body.planId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      if (!VALID_PAID_PLANS.has(planId) || planId === 'enterprise') {
        return res.status(400).json({ success: false, error: 'Invalid plan for checkout' });
      }

      const amount = OWNER_SAAS_PLAN_PRICES[planId];
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

      const order = await razorpayDeps.razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `owner_saas_${resolvedTenantId}_${Date.now()}`,
        notes: {
          type: 'owner_saas',
          tenantId: resolvedTenantId,
          planId,
          ownerUid: req.user.uid,
        },
      });

      res.json({ success: true, order, key: razorpayDeps.razorpayKeyId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      });
    }
  });

  app.post('/api/owner/subscription/confirm-payment', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const planId = typeof req.body?.planId === 'string' ? req.body.planId.trim() : '';
      const orderId = typeof req.body?.razorpay_order_id === 'string' ? req.body.razorpay_order_id.trim() : '';
      const paymentId = typeof req.body?.razorpay_payment_id === 'string' ? req.body.razorpay_payment_id.trim() : '';
      const signature = typeof req.body?.razorpay_signature === 'string' ? req.body.razorpay_signature.trim() : '';
      const isMock = req.body?.isMock === true;

      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      if (!VALID_PAID_PLANS.has(planId) || planId === 'enterprise') {
        return res.status(400).json({ success: false, error: 'Invalid plan id' });
      }

      if (!isMock) {
        if (!orderId || !paymentId || !signature) {
          return res.status(400).json({ success: false, error: 'Missing payment verification parameters' });
        }
        if (!razorpayDeps?.isRazorpayConfigured) {
          return res.status(500).json({ success: false, error: 'Razorpay is not configured for verification' });
        }
        const verified = razorpayDeps.verifyRazorpaySignature(orderId, paymentId, signature);
        if (!verified) {
          return res.status(400).json({ success: false, error: 'Payment signature verification failed' });
        }
      } else if (process.env.NODE_ENV === 'production') {
        return res.status(400).json({ success: false, error: 'Mock payments are not allowed in production' });
      }

      const paidPatch = buildPaidSubscriptionPatch(planId, isMock ? undefined : { orderId, paymentId });
      await db.collection('tenants').doc(resolvedTenantId).set(
        {
          ...paidPatch,
          updatedAt: fieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      res.json({ success: true, tenantId: resolvedTenantId, planId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm subscription payment',
      });
    }
  });
}

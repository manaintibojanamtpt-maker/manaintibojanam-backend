import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';

type RequireSuperadminFn = (req: Request, res: Response, next: () => void) => void | Promise<void>;

const VALID_GRANT_PLANS = new Set(['growth', 'pro', 'enterprise']);

export function registerPlatformTenantSubscriptionRoutes(
  app: Express,
  db: Firestore,
  requireSuperadmin: RequireSuperadminFn,
  fieldValue: typeof FieldValue,
): void {
  app.post('/api/platform/tenant-subscription', requireSuperadmin, async (req: any, res: Response) => {
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
      const subscription = (tenant.subscription ?? {}) as Record<string, unknown>;
      const patch: Record<string, unknown> = { updatedAt: fieldValue.serverTimestamp() };
      const actorEmail = (req.user?.email || 'superadmin').toLowerCase();

      if (action === 'extendTrial') {
        const days = Number(req.body?.days);
        if (!Number.isFinite(days) || days < 1 || days > 90) {
          return res.status(400).json({ success: false, error: 'days must be between 1 and 90' });
        }

        const base = subscription.trialExpiresAt
          ? new Date(String(subscription.trialExpiresAt))
          : new Date();
        if (base.getTime() < Date.now()) {
          base.setTime(Date.now());
        }
        base.setDate(base.getDate() + days);
        const trialExpiresIso = base.toISOString();
        const planId = typeof subscription.planId === 'string' ? subscription.planId : 'growth';

        patch.status = 'trialing';
        patch.storeStatus = tenant.storeStatus === 'published' ? 'active' : tenant.storeStatus ?? 'active';
        patch.trialEndsAt = trialExpiresIso;
        patch.subscription = {
          ...subscription,
          planId,
          status: 'trialing',
          trialExpiresAt: trialExpiresIso,
          founderOverride: true,
          founderOverrideBy: actorEmail,
          founderOverrideAt: new Date().toISOString(),
        };

        await db.collection('tenants').doc(tenantId).set(patch, { merge: true });
        return res.json({
          success: true,
          tenantId,
          action,
          trialExpiresAt: trialExpiresIso,
        });
      }

      if (action === 'grantPlan') {
        const planId = typeof req.body?.planId === 'string' ? req.body.planId.trim() : 'growth';
        if (!VALID_GRANT_PLANS.has(planId)) {
          return res.status(400).json({ success: false, error: 'Invalid planId' });
        }

        patch.status = 'active';
        patch.storeStatus = 'active';
        patch.trialEndsAt = fieldValue.delete();
        patch.subscription = {
          planId,
          status: 'active',
          trialUsed: true,
          founderGranted: true,
          founderOverride: true,
          founderOverrideBy: actorEmail,
          founderOverrideAt: new Date().toISOString(),
          paidActivatedAt: new Date().toISOString(),
        };

        await db.collection('tenants').doc(tenantId).set(patch, { merge: true });
        return res.json({ success: true, tenantId, action, planId });
      }

      if (action === 'bypassExpiry') {
        const days = Number(req.body?.days) || 30;
        const expires = new Date();
        expires.setDate(expires.getDate() + days);
        const trialExpiresIso = expires.toISOString();
        const planId = typeof subscription.planId === 'string' ? subscription.planId : 'growth';

        patch.status = 'trialing';
        patch.storeStatus = 'active';
        patch.trialEndsAt = trialExpiresIso;
        patch.subscription = {
          ...subscription,
          planId,
          status: 'trialing',
          trialExpiresAt: trialExpiresIso,
          founderOverride: true,
          founderBypassExpiry: true,
          founderOverrideBy: actorEmail,
          founderOverrideAt: new Date().toISOString(),
        };

        await db.collection('tenants').doc(tenantId).set(patch, { merge: true });
        return res.json({
          success: true,
          tenantId,
          action,
          trialExpiresAt: trialExpiresIso,
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
}

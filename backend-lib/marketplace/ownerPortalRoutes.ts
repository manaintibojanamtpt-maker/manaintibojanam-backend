import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

type SendEmailFn = (to: string, subject: string, body: string) => Promise<void>;
type GetTransporterFn = () => unknown;
type GetFounderEmailFn = () => string;

function referralCodeForTenant(tenantId: string): string {
  return `BHOJ-${tenantId.substring(0, 6).toUpperCase()}`;
}

export function registerOwnerPortalRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
  deps: {
    sendEmailNotification: SendEmailFn;
    getTransporter: GetTransporterFn;
    getFounderEmail: GetFounderEmailFn;
  },
): void {
  app.get('/api/owner/referrals', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const raw = tenantDoc.data() as Record<string, unknown>;
      const referral = (raw.referral ?? {}) as Record<string, unknown>;
      let referralCode = typeof referral.referralCode === 'string' ? referral.referralCode : '';

      if (!referralCode) {
        referralCode = referralCodeForTenant(resolvedTenantId);
        await db.collection('tenants').doc(resolvedTenantId).set(
          {
            referral: {
              referralCode,
              successfulReferrals: 0,
              referralCount: 0,
            },
            updatedAt: fieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      res.json({
        success: true,
        tenantId: resolvedTenantId,
        referral: {
          referralCode,
          successfulReferrals: Number(referral.successfulReferrals ?? 0),
          referralCount: Number(referral.referralCount ?? 0),
        },
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load referral program',
      });
    }
  });

  app.post('/api/owner/campaigns', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const audience = typeof req.body?.audience === 'string' ? req.body.audience.trim() : '';
      if (!audience) {
        return res.status(400).json({ success: false, error: 'Campaign audience is required' });
      }

      const ref = await db.collection('campaigns').add({
        tenantId: resolvedTenantId,
        audience,
        couponCode: req.body?.couponCode ?? '',
        expectedReach: Number(req.body?.expectedReach ?? 0),
        expectedOrders: Number(req.body?.expectedOrders ?? 0),
        expectedRevenueLift: Number(req.body?.expectedRevenueLift ?? 0),
        confidenceScore: Number(req.body?.confidenceScore ?? 0),
        status: 'launched',
        createdAt: fieldValue.serverTimestamp(),
      });

      res.json({ success: true, id: ref.id, tenantId: resolvedTenantId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to launch campaign',
      });
    }
  });

  app.put('/api/owner/kyc/profile', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const kyc = (req.body?.kyc ?? {}) as Record<string, unknown>;

      const patch: Record<string, unknown> = {
        updatedAt: fieldValue.serverTimestamp(),
        'kyc.verificationLevel': 1,
        'kyc.status': 'pending_verification',
      };

      const fields = [
        'ownerName',
        'businessName',
        'phone',
        'email',
        'address',
        'city',
        'state',
        'country',
        'pincode',
        'gstNumber',
        'panNumber',
        'bankAccountHolder',
        'bankAccountNumber',
        'bankIfsc',
        'bankName',
      ] as const;

      for (const field of fields) {
        if (typeof kyc[field] === 'string') {
          patch[`kyc.${field}`] = kyc[field];
        }
      }

      if (typeof kyc.fssaiNumber === 'string') {
        patch['fssai.number'] = kyc.fssaiNumber;
        patch['fssai.verificationStatus'] = kyc.fssaiNumber ? 'submitted' : 'not_submitted';
      }

      await db.collection('tenants').doc(resolvedTenantId).set(patch, { merge: true });
      res.json({ success: true, tenantId: resolvedTenantId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save KYC profile',
      });
    }
  });

  app.put('/api/owner/kyc/declaration', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      await db.collection('tenants').doc(resolvedTenantId).set(
        {
          'legal.merchantDeclarationAcceptedAt': new Date().toISOString(),
          updatedAt: fieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      res.json({ success: true, tenantId: resolvedTenantId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept declaration',
      });
    }
  });

  app.get('/api/owner/release-notes/latest', verifyFirebaseToken, async (_req: any, res: Response) => {
    try {
      const snapshot = await db.collection('release_notes').where('isPublished', '==', true).get();
      const releases = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      releases.sort((a, b) =>
        String((b as { version?: string }).version ?? '').localeCompare(
          String((a as { version?: string }).version ?? ''),
          undefined,
          { numeric: true, sensitivity: 'base' },
        ),
      );
      res.json({ success: true, release: releases[0] ?? null });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load release notes',
      });
    }
  });

  app.patch('/api/owner/tenant/preferences', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const patch: Record<string, unknown> = { updatedAt: fieldValue.serverTimestamp() };

      if (typeof req.body?.lastViewedReleaseVersion === 'string') {
        patch.lastViewedReleaseVersion = req.body.lastViewedReleaseVersion;
      }

      await db.collection('tenants').doc(resolvedTenantId).set(patch, { merge: true });
      res.json({ success: true, tenantId: resolvedTenantId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update preferences',
      });
    }
  });

  app.post('/api/owner/feedback', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId =
        typeof req.body?.tenantId === 'string'
          ? req.body.tenantId.trim()
          : typeof req.headers['x-tenant-id'] === 'string'
            ? req.headers['x-tenant-id'].trim()
            : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const {
        type,
        description,
        rating,
        plan,
        businessType,
        merchantHealthSnapshot,
        ownerName,
        ownerEmail,
      } = req.body ?? {};

      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      const tenantName = tenantDoc.exists ? String(tenantDoc.data()?.name ?? resolvedTenantId) : resolvedTenantId;

      await db.collection('merchant_feedback').add({
        tenantId: resolvedTenantId,
        type: type ?? 'general',
        description: description ?? '',
        rating: rating ?? null,
        merchantHealthSnapshot: merchantHealthSnapshot ?? null,
        plan: plan ?? 'free',
        businessType: businessType ?? 'unknown',
        ownerName: ownerName ?? req.user.email ?? '',
        ownerEmail: ownerEmail ?? req.user.email ?? '',
        status: 'new',
        timestamp: fieldValue.serverTimestamp(),
      });

      const founderEmail = deps.getFounderEmail();
      const subject = `[BhojanOS Merchant Feedback] ${type || 'general'} — ${tenantName}`;
      const body = [
        'Merchant feedback received',
        '',
        `Tenant: ${tenantName} (${resolvedTenantId})`,
        `Owner: ${ownerName || req.user.email || req.user.uid}`,
        `Owner Email: ${ownerEmail || req.user.email || 'N/A'}`,
        `Category: ${type || 'general'}`,
        `Plan: ${plan || 'unknown'}`,
        `Business Type: ${businessType || 'unknown'}`,
        `Merchant Health Score: ${merchantHealthSnapshot ?? 'N/A'}`,
        rating ? `Rating: ${rating}/5` : '',
        '',
        'Message:',
        description || 'No additional message provided.',
      ]
        .filter(Boolean)
        .join('\n');

      await deps.sendEmailNotification(founderEmail, subject, body);

      res.json({ success: true, emailSent: Boolean(deps.getTransporter()) });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit feedback',
      });
    }
  });
}

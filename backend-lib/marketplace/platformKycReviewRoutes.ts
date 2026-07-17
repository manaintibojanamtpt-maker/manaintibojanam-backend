import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';

type RequireSuperadminFn = (req: Request, res: Response, next: () => void) => void | Promise<void>;

function isPendingKyc(kyc: Record<string, unknown> | undefined): boolean {
  if (!kyc) return false;
  const status = typeof kyc.status === 'string' ? kyc.status : '';
  const level = typeof kyc.verificationLevel === 'number' ? kyc.verificationLevel : 0;
  return status === 'pending_verification' || level === 1;
}

function serializeTenantSummary(id: string, data: Record<string, unknown>) {
  const kyc = (data.kyc ?? {}) as Record<string, unknown>;
  return {
    tenantId: id,
    slug: typeof data.slug === 'string' ? data.slug : id,
    name: typeof data.name === 'string' ? data.name : '',
    status: typeof data.status === 'string' ? data.status : 'pending',
    kyc: {
      ownerName: kyc.ownerName ?? '',
      businessName: kyc.businessName ?? '',
      email: kyc.email ?? '',
      phone: kyc.phone ?? kyc.mobileNumber ?? '',
      gstNumber: kyc.gstNumber ?? '',
      panNumber: kyc.panNumber ?? '',
      status: kyc.status ?? 'pending_verification',
      verificationLevel: kyc.verificationLevel ?? 1,
      documents: kyc.documents ?? {},
    },
    fssai: data.fssai ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export function registerPlatformKycReviewRoutes(
  app: Express,
  db: Firestore,
  requireSuperadmin: RequireSuperadminFn,
  fieldValue: typeof FieldValue,
): void {
  app.get('/api/platform/kyc/pending', requireSuperadmin, async (_req: any, res: Response) => {
    try {
      const snapshot = await db.collection('tenants').get();
      const pending = snapshot.docs
        .map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
        .filter(({ data }) => isPendingKyc(data.kyc as Record<string, unknown> | undefined))
        .map(({ id, data }) => serializeTenantSummary(id, data));

      res.json({ success: true, pending, count: pending.length });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load pending KYC queue',
      });
    }
  });

  app.post('/api/platform/kyc/review', requireSuperadmin, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const action = typeof req.body?.action === 'string' ? req.body.action.trim() : '';
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'tenantId is required' });
      }
      if (action !== 'approve' && action !== 'reject') {
        return res.status(400).json({ success: false, error: 'action must be approve or reject' });
      }
      if (action === 'reject' && !reason) {
        return res.status(400).json({ success: false, error: 'reason is required when rejecting KYC' });
      }

      const tenantRef = db.collection('tenants').doc(tenantId);
      const tenantDoc = await tenantRef.get();
      if (!tenantDoc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const tenant = tenantDoc.data() as Record<string, unknown>;
      if (!isPendingKyc(tenant.kyc as Record<string, unknown> | undefined)) {
        return res.status(409).json({ success: false, error: 'Tenant is not pending KYC review' });
      }

      const actorEmail = (req.user?.email || 'superadmin').toLowerCase();
      const nowIso = new Date().toISOString();
      const patch: Record<string, unknown> = { updatedAt: fieldValue.serverTimestamp() };

      if (action === 'approve') {
        patch['kyc.status'] = 'verified';
        patch['kyc.verificationLevel'] = 2;
        patch['kyc.verifiedAt'] = nowIso;
        patch['kyc.verifiedBy'] = actorEmail;
        patch['kyc.rejectionReason'] = fieldValue.delete();
      } else {
        patch['kyc.status'] = 'rejected';
        patch['kyc.verificationLevel'] = 0;
        patch['kyc.rejectionReason'] = reason;
        patch['kyc.rejectedAt'] = nowIso;
        patch['kyc.rejectedBy'] = actorEmail;
      }

      await tenantRef.set(patch, { merge: true });
      res.json({ success: true, tenantId, action, status: action === 'approve' ? 'verified' : 'rejected' });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to review KYC',
      });
    }
  });
}

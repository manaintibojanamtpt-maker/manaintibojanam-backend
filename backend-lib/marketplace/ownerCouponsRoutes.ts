import type { Express, Request, Response } from 'express';
import type { DocumentReference, Firestore, FieldValue } from 'firebase-admin/firestore';
import { publishTenantDomainEvent } from './tenantDomainEventBus.js';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

export interface OwnerCouponRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly discountType: 'fixed' | 'percentage';
  readonly discountValue: number;
  readonly minOrder: number;
  readonly isActive: boolean;
}

function normalizeCouponCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : '';
}

function normalizeDiscountType(raw: unknown): 'fixed' | 'percentage' {
  return raw === 'percentage' ? 'percentage' : 'fixed';
}

function mapCouponDoc(id: string, data: Record<string, unknown>): OwnerCouponRecord {
  return {
    id,
    tenantId: String(data.tenantId ?? ''),
    code: String(data.code ?? ''),
    discountType: normalizeDiscountType(data.discountType),
    discountValue: Number(data.discountValue ?? 0),
    minOrder: Number(data.minOrder ?? 0),
    isActive: data.isActive !== false,
  };
}

async function loadOwnedCoupon(
  db: Firestore,
  couponId: string,
  tenantId: string,
): Promise<{ ref: DocumentReference; data: Record<string, unknown> } | null> {
  const ref = db.collection('coupons').doc(couponId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  const couponTenant = String(data.tenantId ?? '').trim();
  if (couponTenant !== tenantId) return null;
  return { ref, data };
}

async function resolveCanonicalTenantId(db: Firestore, tenantRef: string): Promise<string> {
  const trimmed = tenantRef.trim();
  if (!trimmed) return trimmed;

  const direct = await db.collection('tenants').doc(trimmed).get();
  if (direct.exists) return direct.id;

  const bySlug = await db.collection('tenants').where('slug', '==', trimmed).limit(1).get();
  if (!bySlug.empty) return bySlug.docs[0].id;

  return trimmed;
}

export function registerOwnerCouponsRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
): void {
  app.get('/api/owner/coupons', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const canonicalTenantId = await resolveCanonicalTenantId(db, resolvedTenantId);
      const snapshot = await db.collection('coupons').where('tenantId', '==', canonicalTenantId).get();
      const coupons = snapshot.docs.map((doc) => mapCouponDoc(doc.id, doc.data() as Record<string, unknown>));
      coupons.sort((a, b) => a.code.localeCompare(b.code));
      res.json({ success: true, tenantId: canonicalTenantId, coupons });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load coupons',
      });
    }
  });

  app.post('/api/owner/coupons', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const canonicalTenantId = await resolveCanonicalTenantId(db, resolvedTenantId);
      const code = normalizeCouponCode(req.body?.code);
      const discountType = normalizeDiscountType(req.body?.discountType);
      const discountValue = Number(req.body?.discountValue);
      const minOrder = Number(req.body?.minOrder ?? 0);

      if (!code) {
        return res.status(400).json({ success: false, error: 'Coupon code is required' });
      }
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return res.status(400).json({ success: false, error: 'Discount value must be greater than zero' });
      }
      if (discountType === 'percentage' && discountValue > 100) {
        return res.status(400).json({ success: false, error: 'Percentage discount cannot exceed 100' });
      }
      if (!Number.isFinite(minOrder) || minOrder < 0) {
        return res.status(400).json({ success: false, error: 'Minimum order must be zero or greater' });
      }

      const duplicate = await db
        .collection('coupons')
        .where('tenantId', '==', canonicalTenantId)
        .where('code', '==', code)
        .limit(1)
        .get();
      if (!duplicate.empty) {
        return res.status(409).json({ success: false, error: 'A coupon with this code already exists' });
      }

      const ref = await db.collection('coupons').add({
        tenantId: canonicalTenantId,
        code,
        discountType,
        discountValue,
        minOrder,
        isActive: true,
        createdAt: fieldValue.serverTimestamp(),
      });

      await publishTenantDomainEvent(db, fieldValue, {
        tenantId: canonicalTenantId,
        type: 'OfferUpdated',
        source: 'owner_coupons_create',
      });

      res.json({ success: true, id: ref.id, tenantId: canonicalTenantId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create coupon',
      });
    }
  });

  app.patch('/api/owner/coupons/:id', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const couponId = String(req.params.id);
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const canonicalTenantId = await resolveCanonicalTenantId(db, resolvedTenantId);
      const owned = await loadOwnedCoupon(db, couponId, canonicalTenantId);
      if (!owned) {
        return res.status(404).json({ success: false, error: 'Coupon not found' });
      }

      const patch: Record<string, unknown> = { updatedAt: fieldValue.serverTimestamp() };
      if (typeof req.body?.isActive === 'boolean') {
        patch.isActive = req.body.isActive;
      }

      await owned.ref.set(patch, { merge: true });

      await publishTenantDomainEvent(db, fieldValue, {
        tenantId: canonicalTenantId,
        type: 'OfferUpdated',
        source: 'owner_coupons_update',
      });

      res.json({ success: true, id: couponId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update coupon',
      });
    }
  });

  app.delete('/api/owner/coupons/:id', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const couponId = String(req.params.id);
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const canonicalTenantId = await resolveCanonicalTenantId(db, resolvedTenantId);
      const owned = await loadOwnedCoupon(db, couponId, canonicalTenantId);
      if (!owned) {
        return res.status(404).json({ success: false, error: 'Coupon not found' });
      }

      await owned.ref.delete();

      await publishTenantDomainEvent(db, fieldValue, {
        tenantId: canonicalTenantId,
        type: 'OfferUpdated',
        source: 'owner_coupons_delete',
      });

      res.json({ success: true, id: couponId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete coupon',
      });
    }
  });
}

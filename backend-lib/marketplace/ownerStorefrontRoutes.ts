import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { parseTenantMarketplace } from '../domain/tenant-marketplace.js';
import {
  countTenantMenuItems,
} from './discoveryProfileWriter.js';
import { validateTenantPublishable } from './tenantDiscoveryProfile.js';
import { publishTenantDomainEvent } from './tenantDomainEventBus.js';
import { inferStorefrontEventType } from '../domain/TenantDomainEventTypes.js';
import { parseFirestoreTenant } from './projectFoodMenuV1.js';
import { isStoreOpenNow, resolveStoreTiming } from './tenantProjectionHelpers.js';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

export function registerOwnerStorefrontRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
): void {
  app.get('/api/owner/storefront/:tenantId', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const doc = await db.collection('tenants').doc(tenantId).get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }
      const data = doc.data() as Record<string, unknown>;
      const tenant = parseFirestoreTenant(tenantId, data);
      const timing = resolveStoreTiming(tenant, data);
      const acceptingOrders = isStoreOpenNow(timing);
      res.json({
        success: true,
        tenantId,
        name: data.name ?? '',
        contact: data.contact ?? {},
        deliveryNotes: data.deliveryNotes ?? '',
        location: data.location ?? {},
        deliveryConfig: data.deliveryConfig ?? {},
        pricingConfig: data.pricingConfig ?? {},
        paymentConfig: data.paymentConfig ?? {},
        features: data.features ?? {},
        marketplace: parseTenantMarketplace(data.marketplace) ?? {},
        storeOperations: data.storeOperations ?? {},
        acceptingOrders,
        branding: data.branding ?? {},
        storeStatus: data.storeStatus ?? 'draft',
        tenantSyncRevision: data.tenantSyncRevision ?? null,
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load storefront',
      });
    }
  });

  app.put('/api/owner/storefront/:tenantId', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const body = req.body ?? {};
      const ref = db.collection('tenants').doc(tenantId);
      const existing = ((await ref.get()).data() ?? {}) as Record<string, unknown>;
      const updates: Record<string, unknown> = { updatedAt: fieldValue.serverTimestamp() };

      const mergeObject = (key: string, incoming: unknown) => {
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return;
        updates[key] = {
          ...((existing[key] as Record<string, unknown> | undefined) ?? {}),
          ...(incoming as Record<string, unknown>),
        };
      };

      if (typeof body.name === 'string') updates.name = body.name;
      if (body.contact) mergeObject('contact', body.contact);
      if (typeof body.deliveryNotes === 'string') updates.deliveryNotes = body.deliveryNotes;
      if (body.location) mergeObject('location', body.location);
      if (body.deliveryConfig) mergeObject('deliveryConfig', body.deliveryConfig);
      if (body.pricingConfig) mergeObject('pricingConfig', body.pricingConfig);
      if (body.paymentConfig) mergeObject('paymentConfig', body.paymentConfig);
      if (body.features) mergeObject('features', body.features);
      if (body.marketplace) mergeObject('marketplace', body.marketplace);
      if (body.branding) mergeObject('branding', body.branding);
      if (body.storeOperations && typeof body.storeOperations === 'object') {
        updates.storeOperations = {
          ...((existing.storeOperations as Record<string, unknown> | undefined) ?? {}),
          ...(body.storeOperations as Record<string, unknown>),
          updatedAt: fieldValue.serverTimestamp(),
        };
      }

      await ref.set(updates, { merge: true });
      const eventType = inferStorefrontEventType(body);
      const sync = await publishTenantDomainEvent(db, fieldValue, {
        tenantId,
        type: eventType,
        source: `owner_storefront_put:${eventType}`,
      });

      res.json({
        success: true,
        tenantId,
        tenantSyncRevision: sync.tenantSyncRevision,
        poolSyncRevision: sync.poolSyncRevision,
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update storefront',
      });
    }
  });

  app.post('/api/owner/storefront/:tenantId/publish', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const doc = await db.collection('tenants').doc(tenantId).get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Kitchen not found' });
      }

      const raw = doc.data() as Record<string, unknown>;
      const menuCount = await countTenantMenuItems(db, tenantId);
      const validation = validateTenantPublishable(raw, menuCount);
      if (!validation.ok) {
        return res.status(400).json({
          success: false,
          error: 'Kitchen is not ready to publish on OrderBhojan',
          validationErrors: validation.errors,
        });
      }

      await db.collection('tenants').doc(tenantId).set(
        {
          storeStatus: 'published',
          updatedAt: fieldValue.serverTimestamp(),
          publishedAt: fieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const sync = await publishTenantDomainEvent(db, fieldValue, {
        tenantId,
        type: 'StoreOperationsUpdated',
        source: 'owner_storefront_publish',
      });

      res.json({
        success: true,
        tenantId,
        storeStatus: 'published',
        menuItemCount: menuCount,
        tenantSyncRevision: sync.tenantSyncRevision,
        poolSyncRevision: sync.poolSyncRevision,
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish storefront',
      });
    }
  });
}

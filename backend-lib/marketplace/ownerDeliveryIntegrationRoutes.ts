import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { assertDeliveryEngineEntitlement } from '../entitlements.ts';
import {
  completeConnection,
  getTenantProviderConnection,
  listTenantProviderConnections,
  revokeConnection,
  startConnection,
  validateConnection,
} from '../delivery/deliveryConnectionService.js';
import {
  mapUiPartnerToProviderId,
  orchestrateTenantDispatch,
} from '../delivery/dispatchOrchestration.js';
import {
  DELIVERY_PROVIDER_CAPABILITY_MATRIX,
  type DeliveryProviderId,
} from '../delivery/providerCapabilityMatrix.js';
import { evaluateProviderReadiness } from '../delivery/deliveryProviderReadiness.js';
import {
  buildOwnerDeliveryConfigFirestoreUpdates,
  readOwnerDeliveryConfig,
  validateOwnerDeliveryConfig,
} from '../delivery/ownerDeliveryConfiguration.js';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

const PROVIDERS = new Set<DeliveryProviderId>([
  'porter',
  'uber_direct',
  'rapido',
  'self_pickup',
]);

function asProvider(value: string): DeliveryProviderId | null {
  return PROVIDERS.has(value as DeliveryProviderId)
    ? (value as DeliveryProviderId)
    : null;
}

export function registerOwnerDeliveryIntegrationRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
): void {
  const deps = { db, fieldValue };

  app.get(
    '/api/owner/delivery-integrations/capabilities',
    verifyFirebaseToken,
    async (req: any, res: Response) => {
      try {
        if (req.query?.tenantId) {
          const tenantId = await assertOwnerTenantAccess(
            req.user.uid,
            String(req.query.tenantId),
            req.user.email,
          );
          await assertDeliveryEngineEntitlement(db, tenantId);
        }
        res.json({
          success: true,
          providers: DELIVERY_PROVIDER_CAPABILITY_MATRIX,
          securityNote:
            'Raw provider passwords/secrets are never stored in the browser or on the public tenant document. Credentials are encrypted server-side only.',
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
        const status = err.statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load delivery capabilities',
          ...(err.requiresUpgrade ? { requiresUpgrade: true } : {}),
        });
      }
    },
  );

  app.get(
    '/api/owner/delivery-integrations/:tenantId',
    verifyFirebaseToken,
    async (req: any, res: Response) => {
      try {
        const tenantId = await assertOwnerTenantAccess(
          req.user.uid,
          String(req.params.tenantId),
          req.user.email,
        );
        await assertDeliveryEngineEntitlement(db, tenantId);
        const connections = await listTenantProviderConnections(deps, tenantId);
        const readiness = DELIVERY_PROVIDER_CAPABILITY_MATRIX.map((row) =>
          evaluateProviderReadiness(
            row.id,
            connections.find((c) => c.provider === row.id) ?? null,
          ),
        );
        res.json({
          success: true,
          tenantId,
          connections,
          providers: DELIVERY_PROVIDER_CAPABILITY_MATRIX,
          readiness,
          securityNote:
            'Raw credentials are never returned. Client only sees connection status and non-secret metadata.',
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
        const status = err.statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load delivery integrations',
          ...(err.requiresUpgrade ? { requiresUpgrade: true } : {}),
        });
      }
    },
  );

  app.post(
    '/api/owner/delivery-integrations/:tenantId/:provider/start',
    verifyFirebaseToken,
    async (req: any, res: Response) => {
      try {
        const provider = asProvider(String(req.params.provider));
        if (!provider) return res.status(400).json({ success: false, error: 'Invalid provider' });
        const tenantId = await assertOwnerTenantAccess(
          req.user.uid,
          String(req.params.tenantId),
          req.user.email,
        );
        await assertDeliveryEngineEntitlement(db, tenantId);
        const connection = await startConnection(deps, {
          tenantId,
          provider,
          actorUid: req.user.uid,
        });
        res.json({ success: true, connection });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
        const status = err.statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start connection',
          ...(err.requiresUpgrade ? { requiresUpgrade: true } : {}),
        });
      }
    },
  );

  app.post(
    '/api/owner/delivery-integrations/:tenantId/:provider/complete',
    verifyFirebaseToken,
    async (req: any, res: Response) => {
      try {
        const provider = asProvider(String(req.params.provider));
        if (!provider) return res.status(400).json({ success: false, error: 'Invalid provider' });
        const tenantId = await assertOwnerTenantAccess(
          req.user.uid,
          String(req.params.tenantId),
          req.user.email,
        );
        await assertDeliveryEngineEntitlement(db, tenantId);
        const body = req.body ?? {};
        const credentials =
          body.credentials && typeof body.credentials === 'object'
            ? (body.credentials as Record<string, string>)
            : undefined;
        const connection = await completeConnection(deps, {
          tenantId,
          provider,
          actorUid: req.user.uid,
          credentials,
          merchantAccountId:
            typeof body.merchantAccountId === 'string' ? body.merchantAccountId : undefined,
          metadata:
            body.metadata && typeof body.metadata === 'object'
              ? (body.metadata as Record<string, unknown>)
              : undefined,
        });
        res.json({ success: true, connection });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
        const status = err.statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to complete connection',
          ...(err.requiresUpgrade ? { requiresUpgrade: true } : {}),
        });
      }
    },
  );

  app.post(
    '/api/owner/delivery-integrations/:tenantId/:provider/validate',
    verifyFirebaseToken,
    async (req: any, res: Response) => {
      try {
        const provider = asProvider(String(req.params.provider));
        if (!provider) return res.status(400).json({ success: false, error: 'Invalid provider' });
        const tenantId = await assertOwnerTenantAccess(
          req.user.uid,
          String(req.params.tenantId),
          req.user.email,
        );
        await assertDeliveryEngineEntitlement(db, tenantId);
        const connection = await validateConnection(deps, {
          tenantId,
          provider,
          actorUid: req.user.uid,
        });
        const readiness = evaluateProviderReadiness(provider, connection);
        res.json({ success: true, connection, readiness });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
        const status = err.statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to validate connection',
          ...(err.requiresUpgrade ? { requiresUpgrade: true } : {}),
        });
      }
    },
  );

  app.get(
    '/api/owner/delivery-integrations/:tenantId/:provider/readiness',
    verifyFirebaseToken,
    async (req: any, res: Response) => {
      try {
        const provider = asProvider(String(req.params.provider));
        if (!provider) return res.status(400).json({ success: false, error: 'Invalid provider' });
        const tenantId = await assertOwnerTenantAccess(
          req.user.uid,
          String(req.params.tenantId),
          req.user.email,
        );
        await assertDeliveryEngineEntitlement(db, tenantId);
        const connection = await getTenantProviderConnection(deps, tenantId, provider);
        const readiness = evaluateProviderReadiness(provider, connection);
        res.json({
          success: true,
          readiness,
          // Never include credentials/ciphertext in readiness responses.
          connectionSummary: connection
            ? {
                status: connection.status,
                hasSecretRef: connection.hasSecretRef,
                errorMessage: connection.errorMessage,
                lastValidatedAt: connection.lastValidatedAt,
              }
            : null,
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
        const status = err.statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load readiness',
          ...(err.requiresUpgrade ? { requiresUpgrade: true } : {}),
        });
      }
    },
  );

  app.post(
    '/api/owner/delivery-integrations/:tenantId/:provider/revoke',
    verifyFirebaseToken,
    async (req: any, res: Response) => {
      try {
        const provider = asProvider(String(req.params.provider));
        if (!provider) return res.status(400).json({ success: false, error: 'Invalid provider' });
        const tenantId = await assertOwnerTenantAccess(
          req.user.uid,
          String(req.params.tenantId),
          req.user.email,
        );
        await assertDeliveryEngineEntitlement(db, tenantId);
        const connection = await revokeConnection(deps, {
          tenantId,
          provider,
          actorUid: req.user.uid,
        });
        res.json({ success: true, connection });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
        const status = err.statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to revoke connection',
          ...(err.requiresUpgrade ? { requiresUpgrade: true } : {}),
        });
      }
    },
  );

  app.get(
    '/api/owner/delivery-integrations/:tenantId/:provider',
    verifyFirebaseToken,
    async (req: any, res: Response) => {
      try {
        const provider = asProvider(String(req.params.provider));
        if (!provider) return res.status(400).json({ success: false, error: 'Invalid provider' });
        const tenantId = await assertOwnerTenantAccess(
          req.user.uid,
          String(req.params.tenantId),
          req.user.email,
        );
        await assertDeliveryEngineEntitlement(db, tenantId);
        const connection = await getTenantProviderConnection(deps, tenantId, provider);
        res.json({ success: true, connection });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
        const status = err.statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load connection',
          ...(err.requiresUpgrade ? { requiresUpgrade: true } : {}),
        });
      }
    },
  );

  /** Optional orchestrated dispatch preview/book — keeps manual OwnerOrders path as default. */
  app.post(
    '/api/owner/delivery-integrations/:tenantId/dispatch',
    verifyFirebaseToken,
    async (req: any, res: Response) => {
      try {
        const tenantId = await assertOwnerTenantAccess(
          req.user.uid,
          String(req.params.tenantId),
          req.user.email,
        );
        await assertDeliveryEngineEntitlement(db, tenantId);
        const body = req.body ?? {};
        const partnerLabel = String(body.deliveryPartner || body.provider || 'Rapido');
        const provider =
          asProvider(String(body.provider || '')) || mapUiPartnerToProviderId(partnerLabel);
        const result = await orchestrateTenantDispatch(deps, {
          tenantId,
          provider,
          orderId: String(body.orderId || ''),
          customerName: String(body.customerName || 'Customer'),
          customerPhone: String(body.customerPhone || ''),
          pickupAddress: String(body.pickupAddress || ''),
          dropoffAddress: String(body.dropoffAddress || ''),
          orderTotal: typeof body.orderTotal === 'number' ? body.orderTotal : undefined,
          manualTrackingUrl:
            typeof body.trackingUrl === 'string' ? body.trackingUrl : undefined,
          riderName: typeof body.riderName === 'string' ? body.riderName : undefined,
          riderPhone: typeof body.riderPhone === 'string' ? body.riderPhone : undefined,
          allowManualFallback: body.allowManualFallback !== false,
        });
        res.json({ success: true, ...result });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
        const status = err.statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Dispatch orchestration failed',
          ...(err.requiresUpgrade ? { requiresUpgrade: true } : {}),
        });
      }
    },
  );

  app.get(
    '/api/owner/delivery-config/:tenantId',
    verifyFirebaseToken,
    async (req: any, res: Response) => {
      try {
        const tenantId = await assertOwnerTenantAccess(
          req.user.uid,
          String(req.params.tenantId),
          req.user.email,
        );
        await assertDeliveryEngineEntitlement(db, tenantId);
        const doc = await db.collection('tenants').doc(tenantId).get();
        if (!doc.exists) {
          return res.status(404).json({ success: false, error: 'Kitchen not found' });
        }
        const raw = doc.data() as Record<string, unknown>;
        const config = readOwnerDeliveryConfig(raw);
        res.json({ success: true, tenantId, config });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
        const status = err.statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load delivery configuration',
          ...(err.requiresUpgrade ? { requiresUpgrade: true } : {}),
        });
      }
    },
  );

  const registerPutRoute = (path: string, ...handlers: any[]) => {
    if (typeof app.put === 'function') {
      app.put(path, ...handlers);
    } else if (typeof app.post === 'function') {
      app.post(path, ...handlers);
    }
  };

  registerPutRoute(
    '/api/owner/delivery-config/:tenantId',
    verifyFirebaseToken,
    async (req: any, res: Response) => {
      try {
        const tenantId = await assertOwnerTenantAccess(
          req.user.uid,
          String(req.params.tenantId),
          req.user.email,
        );
        await assertDeliveryEngineEntitlement(db, tenantId);
        const validation = validateOwnerDeliveryConfig(req.body);
        if (!validation.ok) {
          return res.status(400).json({ success: false, error: validation.error });
        }
        const updates = buildOwnerDeliveryConfigFirestoreUpdates(validation.data);
        await db.collection('tenants').doc(tenantId).set(
          {
            ...updates,
            updatedAt: fieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        res.json({ success: true, tenantId, config: validation.data });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; requiresUpgrade?: boolean; message?: string };
        const status = err.statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save delivery configuration',
          ...(err.requiresUpgrade ? { requiresUpgrade: true } : {}),
        });
      }
    },
  );
}

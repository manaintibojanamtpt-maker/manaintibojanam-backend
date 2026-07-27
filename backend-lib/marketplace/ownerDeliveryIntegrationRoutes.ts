import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
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
    (_req, res) => {
      res.json({
        success: true,
        providers: DELIVERY_PROVIDER_CAPABILITY_MATRIX,
        securityNote:
          'Raw provider passwords/secrets are never stored in the browser or on the public tenant document. Credentials are encrypted server-side only.',
      });
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
        const status = (error as { statusCode?: number }).statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load delivery integrations',
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
        const connection = await startConnection(deps, {
          tenantId,
          provider,
          actorUid: req.user.uid,
        });
        res.json({ success: true, connection });
      } catch (error: unknown) {
        const status = (error as { statusCode?: number }).statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start connection',
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
        const status = (error as { statusCode?: number }).statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to complete connection',
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
        const connection = await validateConnection(deps, {
          tenantId,
          provider,
          actorUid: req.user.uid,
        });
        const readiness = evaluateProviderReadiness(provider, connection);
        res.json({ success: true, connection, readiness });
      } catch (error: unknown) {
        const status = (error as { statusCode?: number }).statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to validate connection',
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
        const status = (error as { statusCode?: number }).statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load readiness',
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
        const connection = await revokeConnection(deps, {
          tenantId,
          provider,
          actorUid: req.user.uid,
        });
        res.json({ success: true, connection });
      } catch (error: unknown) {
        const status = (error as { statusCode?: number }).statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to revoke connection',
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
        const connection = await getTenantProviderConnection(deps, tenantId, provider);
        res.json({ success: true, connection });
      } catch (error: unknown) {
        const status = (error as { statusCode?: number }).statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load connection',
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
        const status = (error as { statusCode?: number }).statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Dispatch orchestration failed',
        });
      }
    },
  );
}

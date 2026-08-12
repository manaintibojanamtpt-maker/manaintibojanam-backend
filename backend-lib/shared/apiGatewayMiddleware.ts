import type { NextFunction, Request, Response } from 'express';
import type { RateLimitRequestHandler } from 'express-rate-limit';

export interface OwnerGatewayRequest extends Request {
  correlationId?: string;
  tenantId?: string;
  user?: Record<string, unknown>;
  gatewayCapabilities?: string[];
}

type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;

export function resolveTenantIdFromRequest(req: Request): string {
  // 1. Check explicit parameters
  if (req.params?.tenantId && typeof req.params.tenantId === 'string' && req.params.tenantId.trim()) {
    return req.params.tenantId.trim();
  }
  if (req.query?.tenantId && typeof req.query.tenantId === 'string' && req.query.tenantId.trim()) {
    return req.query.tenantId.trim();
  }
  if (req.body?.tenantId && typeof req.body.tenantId === 'string' && req.body.tenantId.trim()) {
    return req.body.tenantId.trim();
  }
  const headerTenant = req.headers['x-tenant-id'];
  if (typeof headerTenant === 'string' && headerTenant.trim()) {
    return headerTenant.trim();
  }
  const attachedTenant = (req as any).tenantId;
  if (typeof attachedTenant === 'string' && attachedTenant.trim()) {
    return attachedTenant.trim();
  }

  // 2. Extract from URL path (e.g. /api/owner/delivery-integrations/mana-inti or /delivery-integrations/mana-inti)
  const fullPath = (req.originalUrl || req.url || req.path || '').split('?')[0];
  const segments = fullPath.split('/').filter(Boolean);
  
  const knownPrefixes = [
    'delivery-integrations',
    'storefront',
    'coupons',
    'orders',
    'kyc',
    'onboarding',
    'ingredients',
    'recipes',
    'menu',
    'categories',
    'analytics',
    'subscription'
  ];

  for (let i = 0; i < segments.length; i++) {
    if (knownPrefixes.includes(segments[i])) {
      const candidate = segments[i + 1];
      if (
        candidate &&
        !['capabilities', 'intelligence', 'document', 'items', 'sync-tenants', 'profile', 'provision', 'activate-growth-trial'].includes(candidate)
      ) {
        return candidate.trim();
      }
    }
  }

  return '';
}

/**
 * Ordered owner API gateway chain:
 * 1. rateLimit passthrough hook
 * 2. tenant resolver stub
 * 3. auth passthrough
 * 4. capability router stub
 *
 * Individual route handlers may still attach verifyFirebaseToken for defense-in-depth
 * until the gateway auth step fully replaces per-route auth.
 */
export function createOwnerApiGatewayMiddleware(deps: {
  rateLimit?: RateLimitRequestHandler;
  verifyAuth?: ExpressMiddleware;
  log?: (level: 'debug' | 'info' | 'warn', message: string, meta?: Record<string, unknown>) => void;
}): ExpressMiddleware[] {
  const log = deps.log ?? (() => {});

  const rateLimitPassthrough: ExpressMiddleware = (req, res, next) => {
    if (!deps.rateLimit) return next();
    deps.rateLimit(req, res, next);
  };

  const tenantResolverStub: ExpressMiddleware = (req, _res, next) => {
    const ownerReq = req as OwnerGatewayRequest;
    ownerReq.tenantId = resolveTenantIdFromRequest(req);
    log('debug', 'owner gateway tenant resolver stub', {
      path: ownerReq.path,
      tenantId: ownerReq.tenantId || null,
      correlationId: ownerReq.correlationId,
    });
    next();
  };

  const authPassthrough: ExpressMiddleware = (req, res, next) => {
    if (!deps.verifyAuth) return next();
    deps.verifyAuth(req, res, next);
  };

  const capabilityRouterStub: ExpressMiddleware = (req, _res, next) => {
    const ownerReq = req as OwnerGatewayRequest;
    const path = ownerReq.path || '';

    const capabilities: string[] = ['owner:base'];
    if (path.includes('/menu')) capabilities.push('owner:menu');
    if (path.includes('/orders')) capabilities.push('owner:orders');
    if (path.includes('/kyc')) capabilities.push('owner:kyc');
    if (path.includes('/onboarding') || path.includes('/provision')) {
      capabilities.push('owner:onboarding');
    }

    ownerReq.gatewayCapabilities = capabilities;
    log('debug', 'owner gateway capability router stub', {
      path,
      capabilities,
      correlationId: ownerReq.correlationId,
    });
    next();
  };

  return [rateLimitPassthrough, tenantResolverStub, authPassthrough, capabilityRouterStub];
}

/** Mount helper — applies the ordered chain to /api/owner/* only. */
export function mountOwnerApiGateway(
  app: { use: (path: string, ...handlers: ExpressMiddleware[]) => void },
  deps: Parameters<typeof createOwnerApiGatewayMiddleware>[0],
): void {
  app.use('/api/owner', ...createOwnerApiGatewayMiddleware(deps));
}

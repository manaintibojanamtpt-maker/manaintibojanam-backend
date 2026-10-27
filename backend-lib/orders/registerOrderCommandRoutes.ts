/**
 * Phase A — Unified order command endpoint.
 *
 *   POST /api/v1/tenants/{tenantId}/orders/{orderId}/commands
 *
 * Design rules enforced here:
 *  - Authentication is mandatory. There is no anonymous fallback.
 *  - Staff identity is derived from verified authentication only; the request
 *    body cannot influence who the actor is or which tenant they belong to.
 *  - `Idempotency-Key` is required and scoped by tenant.
 *  - Errors are machine readable so an offline client can classify them.
 */

import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  processOrderCommand,
  httpStatusForProcessingResult,
  type OrderCommandEnvelope,
} from './orderCommandProcessor';
import {
  isRoleAllowedForCommand,
  httpStatusForCommandError,
  validateCommandEnvelope,
  type CommandActor,
  type CommandActorRole,
  type OrderCommandErrorCode,
} from './orderCommandContract';
import {
  METRIC,
  logStructured,
  metricsSnapshot,
  recordCounter,
  recordValue,
  resolveCorrelationId,
} from './orderObservability';

export interface VerifiedUser {
  uid: string;
  admin?: boolean;
  email?: string;
  /** Role claim on the ID token, if the project sets one. */
  role?: string;
}

export interface TenantMembership {
  tenantId: string;
  /** Role recorded against the membership, if the project tracks one. */
  role?: string;
}

export interface RegisterOrderCommandRoutesOptions {
  db: Firestore;
  fieldValue: typeof FieldValue;
  /** Must verify the Firebase ID token; never trust an unverified header. */
  verifyFirebaseToken?: (token: string) => Promise<VerifiedUser>;
  /** Tenant membership for a user. Owners, managers and staff all appear here. */
  getOwnedTenantIds?: (uid: string) => Promise<string[]>;
  /**
   * Preferred membership lookup: returns the role recorded per tenant so the
   * actor's authority comes from the membership record rather than a guess.
   */
  getTenantMemberships?: (uid: string) => Promise<TenantMembership[]>;
  /** Check if POS is enabled for a tenant. Missing posEnabled defaults to true. */
  isPosEnabled?: (tenantId: string) => Promise<boolean>;
}

const errorBody = (
  code: OrderCommandErrorCode,
  message: string,
  extras: { correlationId: string; retryable?: boolean; currentVersion?: number } = { correlationId: '' }
) => ({
  success: false,
  error: {
    code,
    message,
    retryable: extras.retryable ?? false,
    ...(extras.currentVersion !== undefined ? { currentVersion: extras.currentVersion } : {}),
  },
  correlationId: extras.correlationId,
});

const normalizeRole = (value: unknown): CommandActorRole | null => {
  const role = String(value ?? '').trim().toUpperCase();
  switch (role) {
    case 'OWNER':
      return 'owner';
    case 'MANAGER':
    case 'ADMIN':
    case 'SUPERADMIN':
      return 'manager';
    case 'CASHIER':
      return 'cashier';
    case 'KITCHEN':
    case 'CHEF':
      return 'kitchen';
    case 'SYSTEM':
      return 'system';
    default:
      return null;
  }
};

/**
 * Resolve the acting role for a tenant. Platform admins and the `system` role
 * are tenant-agnostic; everyone else must belong to the tenant.
 *
 * An authenticated tenant member with no role anywhere is rejected rather than
 * upgraded: silently granting the most privileged staff role would let any
 * signed-in account record payments and change order state in a tenant it has
 * never been given authority for.
 */
export const resolveActorForTenant = (
  user: VerifiedUser,
  tenantId: string,
  tenantIds: string[],
  membershipRole?: string
): { ok: true; actor: CommandActor } | { ok: false; code: OrderCommandErrorCode; message: string } => {
  const claimedRole = normalizeRole(user.role);
  const membershipRoleValue = normalizeRole(membershipRole);
  const tenantMember = tenantIds.includes(tenantId);

  if (user.admin !== true && !tenantMember) {
    return {
      ok: false,
      code: 'FORBIDDEN_TENANT',
      message: 'Authenticated user is not a member of this tenant.',
    };
  }

  const role: CommandActorRole = user.admin === true
    ? 'admin'
    : membershipRoleValue ?? claimedRole;

  if (!role) {
    return {
      ok: false,
      code: 'FORBIDDEN_ROLE',
      message:
        'No POS role is assigned to this account for this tenant. Ask an owner to assign a role before using the POS.',
    };
  }

  return {
    ok: true,
    actor: {
      uid: user.uid,
      role,
      tenantIds,
      ...(user.email ? { email: user.email } : {}),
    },
  };
};

const extractBearerToken = (header: unknown): string | null => {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match ? match[1].trim() : null;
};

export function registerOrderCommandRoutes(
  app: Express,
  options: RegisterOrderCommandRoutesOptions
): void {
  const { db, fieldValue, verifyFirebaseToken, getOwnedTenantIds, getTenantMemberships, isPosEnabled } = options;

  /**
   * Scraper-friendly snapshot of command/outbox metrics. Admin only.
   */
  app.get('/api/v1/ops/order-command-metrics', async (req: Request, res: Response) => {
    const correlationId = resolveCorrelationId(req.headers['x-correlation-id']);
    if (!verifyFirebaseToken) {
      return res.status(401).json(errorBody('UNAUTHENTICATED', 'Token verification unavailable.', { correlationId }));
    }
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json(errorBody('UNAUTHENTICATED', 'Bearer token required.', { correlationId }));
    }
    try {
      const user = await verifyFirebaseToken(token);
      if (user.admin !== true) {
        return res.status(403).json(errorBody('FORBIDDEN_ROLE', 'Admin access required.', { correlationId }));
      }
      return res.status(200).json(metricsSnapshot());
    } catch {
      return res.status(401).json(errorBody('UNAUTHENTICATED', 'Invalid or expired token.', { correlationId }));
    }
  });

  app.post('/api/v1/tenants/:tenantId/orders/:orderId/commands', async (req: Request, res: Response) => {
    const correlationId = resolveCorrelationId(req.headers['x-correlation-id']);
    const startedAt = Date.now();
    const { tenantId, orderId } = req.params;

    const idempotencyKeyHeader = req.headers['idempotency-key'] ?? req.headers['x-idempotency-key'];
    const validation = validateCommandEnvelope(req.body, idempotencyKeyHeader as string | undefined);
    if ('code' in validation) {
      recordCounter(METRIC.commandFailed, 1, { code: validation.code });
      return res
        .status(httpStatusForCommandError(validation.code))
        .json(errorBody(validation.code, validation.message, { correlationId }));
    }

    const body: Record<string, unknown> = req.body as Record<string, unknown>;
    const commandType = validation.envelope.type;
    const commandId = validation.envelope.commandId;

    /**
     * The Idempotency-Key is the durable receipt key, so it must be the same
     * value as the command id. Without this binding a client could reuse one
     * header for several commands — or replay a header with a different body —
     * and the receipt for unrelated work would be served in its place.
     */
    const idempotencyKey = String(idempotencyKeyHeader).trim();
    if (idempotencyKey !== commandId) {
      recordCounter(METRIC.idempotencyConflict);
      return res.status(400).json(
        errorBody(
          'INVALID_IDEMPOTENCY_KEY',
          'Idempotency-Key must match the commandId in the request body.',
          { correlationId }
        )
      );
    }

    if (!verifyFirebaseToken) {
      return res
        .status(500)
        .json(errorBody('INTERNAL_ERROR', 'Command endpoint is not configured for authenticated access.', {
          correlationId,
          retryable: true,
        }));
    }

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      recordCounter(METRIC.authRejected, 1, { code: 'UNAUTHENTICATED' });
      logStructured('warn', 'order_command.unauthenticated', {
        correlationId,
        tenantId,
        orderId,
        commandId,
        reason: 'missing_bearer_token',
      });
      return res
        .status(401)
        .json(errorBody('UNAUTHENTICATED', 'Authentication required. Sign in again to sync queued work.', {
          correlationId,
        }));
    }

    let user: VerifiedUser;
    try {
      user = await verifyFirebaseToken(token);
    } catch {
      recordCounter(METRIC.authRejected, 1, { code: 'UNAUTHENTICATED' });
      logStructured('warn', 'order_command.unauthenticated', {
        correlationId,
        tenantId,
        orderId,
        commandId,
        reason: 'invalid_token',
      });
      return res
        .status(401)
        .json(errorBody('UNAUTHENTICATED', 'Authentication expired or invalid. Sign in again to sync queued work.', {
          correlationId,
        }));
    }

    const memberships = getTenantMemberships ? await getTenantMemberships(user.uid) : [];
    const tenantIds = memberships.length
      ? memberships.map((membership) => membership.tenantId)
      : getOwnedTenantIds
        ? await getOwnedTenantIds(user.uid)
        : [];
    const membershipRole = memberships.find((membership) => membership.tenantId === tenantId)?.role;
    const resolved = resolveActorForTenant(user, tenantId, tenantIds, membershipRole);
    if ('code' in resolved) {
      recordCounter(METRIC.authRejected, 1, { code: resolved.code });
      logStructured('warn', 'order_command.forbidden_tenant', {
        correlationId,
        tenantId,
        orderId,
        commandId,
        actorUid: user.uid,
      });
      return res.status(httpStatusForCommandError(resolved.code)).json(
        errorBody(resolved.code, resolved.message, { correlationId })
      );
    }

    if (!isRoleAllowedForCommand(commandType, resolved.actor.role)) {
      recordCounter(METRIC.authRejected, 1, { code: 'FORBIDDEN_ROLE' });
      logStructured('warn', 'order_command.forbidden_role', {
        correlationId,
        tenantId,
        orderId,
        commandId,
        commandType,
        actorRole: resolved.actor.role,
      });
      return res
        .status(403)
        .json(
          errorBody('FORBIDDEN_ROLE', `Role '${resolved.actor.role}' may not execute ${commandType}.`, {
            correlationId,
          })
        );
    }

    // POS counter operations (CreateOrder) are checked against the operational toggle server-side.
    // General order lifecycle operations (MarkPreparing, MarkReady, UpdateOrderStatus) are preserved.
    if (commandType === 'CreateOrder' && isPosEnabled) {
      const enabled = await isPosEnabled(tenantId);
      if (!enabled) {
        recordCounter(METRIC.commandFailed, 1, { code: 'POS_DISABLED' });
        logStructured('warn', 'order_command.pos_disabled', {
          correlationId,
          tenantId,
          orderId,
          commandId,
          commandType,
        });
        return res.status(503).json(
          errorBody('POS_DISABLED', 'Point of Sale is currently disabled for this restaurant.', {
            correlationId,
            retryable: true,
          })
        );
      }
    }

    // Path parameters are authoritative over the body so a client cannot claim
    // a different tenant or order than the one it is authorised for.
    const envelope: OrderCommandEnvelope = {
      ...validation.envelope,
      tenantId,
      orderId,
      correlationId,
    };

    try {
      const result = await processOrderCommand(db, fieldValue, envelope, resolved.actor, correlationId);

      if (!result.success && result.error) {
        const status = httpStatusForProcessingResult(result);
        recordCounter(METRIC.commandFailed, 1, { code: result.error.code });
        recordValue(METRIC.commandLatency, Date.now() - startedAt, {
          type: commandType,
          outcome: 'rejected',
        });
        logStructured('warn', 'order_command.rejected_response', {
          correlationId,
          tenantId,
          orderId,
          commandId,
          commandType,
          code: result.error.code,
          status,
        });
        return res.status(status).json({
          ...result,
          error: {
            ...result.error,
            retryable: result.error.retryable ?? false,
          },
        });
      }

      recordValue(METRIC.commandLatency, Date.now() - startedAt, {
        type: commandType,
        outcome: result.replayed ? 'replayed' : 'applied',
      });
      return res.status(200).json(result);
    } catch (error: unknown) {
      recordCounter(METRIC.commandFailed, 1, { code: 'INTERNAL_ERROR' });
      const message = error instanceof Error ? error.message : 'Unknown error';
      logStructured('error', 'order_command.internal_error', {
        correlationId,
        tenantId,
        orderId,
        commandId,
        commandType,
        error: message,
      });
      return res.status(500).json(
        errorBody('INTERNAL_ERROR', 'Command could not be committed. Safe to retry with the same Idempotency-Key.', {
          correlationId,
          retryable: true,
        })
      );
    }
  });
}
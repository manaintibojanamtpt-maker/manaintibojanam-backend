/**
 * POS tenant session: which tenant a terminal may actually act on.
 *
 * Why this endpoint exists
 * ------------------------
 * The POS used to hardcode one tenant id in its shell. Every order, KOT, payment
 * and queued command inherited that constant, so a terminal configured for one
 * restaurant could be pointed at another by editing a constant — and a signed-in
 * staff member had no way to select a tenant they genuinely belonged to. The
 * authority for "which tenants may this person use" already existed server-side,
 * in the membership records; it just was not reachable from the POS.
 *
 * What this endpoint guarantees
 * -----------------------------
 *  - It answers only for a verified Firebase ID token. There is no anonymous or
 *    body-supplied identity.
 *  - The list is derived from the caller's memberships, filtered to roles that
 *    mean something at a POS counter. A membership with no usable role is
 *    omitted rather than upgraded: silently granting the most privileged staff
 *    role would let any signed-in account sell in a tenant it was never given
 *    authority for.
 *  - A caller with no usable membership gets an empty list, not a fallback
 *    tenant. The client treats an empty list as "locked out".
 *
 * It does not issue a token or a grant. Authorization for each action stays with
 * the command endpoint, which re-checks membership per command; this endpoint
 * only tells the UI what to show and which tenant to bind to locally.
 */

import type { Express, Request, Response } from 'express';
import {
  resolveActorForTenant,
  type TenantMembership,
  type VerifiedUser,
} from '../orders/registerOrderCommandRoutes';

/**
 * Roles that mean "may operate a POS terminal here". Mirrors the POS role
 * aliases the membership lookup already normalizes to.
 */
export const POS_TENANT_ROLES: ReadonlySet<string> = new Set([
  'owner',
  'manager',
  'cashier',
  'kitchen',
]);

export interface PosTenantMembership {
  tenantId: string;
  /** Normalized role, absent when the membership carries no usable role. */
  role?: string;
}

export interface RegisterPosTenantRoutesOptions {
  /** Must verify the Firebase ID token; never trust an unverified header. */
  verifyFirebaseToken?: (token: string) => Promise<VerifiedUser>;
  getTenantMemberships?: (uid: string) => Promise<TenantMembership[]>;
  /** Resolve a display name for a tenant. Optional; ids still work without it. */
  getTenantName?: (tenantId: string) => Promise<string | null>;
}

const extractBearerToken = (header: unknown): string | null => {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match ? match[1].trim() : null;
};

/**
 * Reduce raw memberships to the ones a POS may bind to.
 *
 * A membership without a usable role is dropped. It is not treated as a
 * cashier: an account that exists but was never granted POS authority must not
 * become able to trade by default.
 */
export const selectPosTenants = (
  memberships: readonly TenantMembership[]
): PosTenantMembership[] => {
  const byTenant = new Map<string, PosTenantMembership>();
  for (const membership of memberships) {
    const tenantId = String(membership?.tenantId ?? '').trim();
    if (!tenantId) continue;
    const role = String(membership?.role ?? '').trim().toLowerCase();
    if (!POS_TENANT_ROLES.has(role)) continue;
    const existing = byTenant.get(tenantId);
    // Keep the strongest role when a tenant appears twice.
    if (!existing) {
      byTenant.set(tenantId, { tenantId, role });
      continue;
    }
    const rank = (value: string) => (value === 'owner' ? 3 : value === 'manager' ? 2 : 1);
    if (rank(role) > rank(String(existing.role ?? ''))) byTenant.set(tenantId, { tenantId, role });
  }
  return [...byTenant.values()].sort((a, b) => a.tenantId.localeCompare(b.tenantId));
};

export function registerPosTenantRoutes(
  app: Express,
  options: RegisterPosTenantRoutesOptions
): void {
  const { verifyFirebaseToken, getTenantMemberships, getTenantName } = options;

  app.get('/api/v1/pos/tenants', async (req: Request, res: Response) => {
    if (!verifyFirebaseToken) {
      return res.status(500).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'POS tenant selection is not configured.' },
      });
    }

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in to use the POS.' },
        tenants: [],
      });
    }

    let user: VerifiedUser;
    try {
      user = await verifyFirebaseToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in again to use the POS.' },
        tenants: [],
      });
    }

    const memberships = getTenantMemberships ? await getTenantMemberships(user.uid) : [];
    const selected = selectPosTenants(memberships);

    const tenants = await Promise.all(
      selected.map(async (membership) => ({
        ...membership,
        name: getTenantName ? await getTenantName(membership.tenantId) : null,
      }))
    );

    // An authenticated caller with no usable membership is a 200 with an empty
    // list, not a 403: the request succeeded and the answer is "none". The
    // distinction matters to the client, which must lock the POS out rather than
    // treat an empty list as an error to retry.
    return res.status(200).json({
      success: true,
      uid: user.uid,
      tenants,
    });
  });

  /**
   * Confirms one tenant is currently selectable by the caller.
   *
   * `resolveActorForTenant` is reused rather than reimplemented so this check and
   * the command endpoint's check cannot drift apart.
   */
  app.get('/api/v1/pos/tenants/:tenantId/authorized', async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    if (!verifyFirebaseToken) {
      return res.status(500).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'POS tenant selection is not configured.' },
      });
    }

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in to use the POS.' },
      });
    }

    let user: VerifiedUser;
    try {
      user = await verifyFirebaseToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in again to use the POS.' },
      });
    }

    const memberships = getTenantMemberships ? await getTenantMemberships(user.uid) : [];
    const tenantIds = memberships.map((membership) => membership.tenantId);
    const membershipRole = memberships.find((membership) => membership.tenantId === tenantId)?.role;

    const resolved = resolveActorForTenant(user, tenantId, tenantIds, membershipRole);
    if ('code' in resolved) {
      return res.status(403).json({
        success: false,
        authorized: false,
        error: { code: resolved.code, message: resolved.message },
      });
    }

    return res.status(200).json({
      success: true,
      authorized: true,
      tenantId,
      role: resolved.actor.role,
    });
  });
}
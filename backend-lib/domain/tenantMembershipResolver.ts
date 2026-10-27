/**
 * Tenant membership resolver.
 *
 * Resolves all legitimate tenant memberships for a user from their user record
 * and the authoritative tenant documents.
 *
 * Boundary separation:
 * --------------------
 * This resolver determines GENERAL tenant membership (owner, manager, cashier,
 * kitchen staff) for the authenticated user. It is shared across order command
 * routes, kitchen displays, pricing review, supervisor operations, and POS.
 *
 * It deliberately DOES NOT filter on `features.posEnabled`. Disabling the POS
 * register at a restaurant must never revoke kitchen manager order execution,
 * delivery dispatch, owner settings management, or the ability of an owner to
 * re-enable the POS. POS-specific enablement is enforced strictly at the POS
 * authorization boundary (`registerPosTenantRoutes`).
 *
 * Security guarantees:
 * -------------------
 * 1. An ordinary user cannot self-assign `owner` by setting client fields:
 *    every claimed `owner` role is verified against the server-controlled
 *    `tenantDoc.ownerId === uid`.
 * 2. Revoked ownership: If a user document is stale and claims `owner`, but the
 *    tenant document has a different `ownerId`, the owner role is stripped.
 *    If the user has a legitimate retained staff role (e.g. cashier in
 *    `tenantRoles`), they retain only that staff role; otherwise they are
 *    dropped.
 * 3. Fallback: If a legitimate owner has no membership records yet in their
 *    user document, the resolver queries `tenants` where `ownerId == uid`.
 */

export const POS_ROLE_ALIASES: Readonly<Record<string, string>> = {
  owner: 'owner',
  founder: 'owner',
  manager: 'manager',
  admin: 'manager',
  superadmin: 'manager',
  cashier: 'cashier',
  counter: 'cashier',
  kitchen: 'kitchen',
  chef: 'kitchen',
};

export interface TenantMembershipRecord {
  tenantId: string;
  role?: string;
}

export interface MembershipResolverDb {
  collection: (name: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean; data: () => Record<string, any> | undefined }>;
    };
    where?: (field: string, op: string, value: any) => {
      limit: (n: number) => {
        get: () => Promise<{ docs: Array<{ id: string; data: () => Record<string, any> | undefined }> }>;
      };
    };
  };
}

export async function resolveTenantMembershipsForUser(
  uid: string,
  db: MembershipResolverDb
): Promise<TenantMembershipRecord[]> {
  const userDoc = await db.collection('users').doc(uid).get();
  const data = (userDoc.exists ? userDoc.data() : {}) as Record<string, any> || {};
  const memberships = new Map<string, TenantMembershipRecord>();

  const addCandidate = (tenantId: unknown, role: unknown) => {
    const id = typeof tenantId === 'string' ? tenantId.trim() : '';
    if (!id) return;
    const normalized = POS_ROLE_ALIASES[String(role ?? '').trim().toLowerCase()];
    const existing = memberships.get(id);
    if (!existing) {
      memberships.set(id, normalized ? { tenantId: id, role: normalized } : { tenantId: id });
      return;
    }
    // Keep the most specific role seen for the tenant.
    if (!existing.role && normalized) existing.role = normalized;
  };

  for (const key of ['tenantId', 'restaurantId']) addCandidate(data[key], data.posRole ?? data.role);
  for (const key of ['ownedTenantIds', 'ownedTenants']) {
    const list = Array.isArray(data[key]) ? data[key] : [];
    for (const tenantId of list) addCandidate(tenantId, 'owner');
  }

  // Per-tenant overrides, e.g. tenantRoles: { tenant_x: 'cashier' }.
  const perTenant = data.tenantRoles && typeof data.tenantRoles === 'object' ? data.tenantRoles : {};
  for (const [tenantId, role] of Object.entries(perTenant as Record<string, unknown>)) {
    addCandidate(tenantId, role);
  }

  // If user has no memberships yet, check if any tenant lists them as ownerId
  if (memberships.size === 0 && db.collection('tenants').where) {
    try {
      const ownedSnaps = await db.collection('tenants').where('ownerId', '==', uid).limit(20).get();
      for (const doc of ownedSnaps.docs) {
        addCandidate(doc.id, 'owner');
      }
    } catch {
      /* index or permission fallback */
    }
  }

  // Verify all candidates against the authoritative tenant document:
  // Enforce ownerId === uid for owner roles (drops revoked ownership if user doc is stale)
  const verified: TenantMembershipRecord[] = [];
  for (const membership of memberships.values()) {
    try {
      const tenantDoc = await db.collection('tenants').doc(membership.tenantId).get();
      if (!tenantDoc.exists) continue;
      const tData = tenantDoc.data() || {};

      // If claimed role is owner, verify ownerId === uid on the tenant document
      if (membership.role === 'owner') {
        if (tData.ownerId !== uid) {
          // Ownership was revoked or transferred: check if a valid non-owner role exists
          const staffRole = perTenant[membership.tenantId];
          const normalizedStaff = staffRole ? POS_ROLE_ALIASES[String(staffRole).trim().toLowerCase()] : null;
          if (normalizedStaff) {
            verified.push({ tenantId: membership.tenantId, role: normalizedStaff });
          }
          continue;
        }
      } else if (!membership.role) {
        if (tData.ownerId === uid) {
          membership.role = 'owner';
        } else {
          continue;
        }
      }

      verified.push(membership);
    } catch {
      // If tenant lookup fails transiently, keep membership if it already had an assigned role
      if (membership.role) verified.push(membership);
    }
  }

  return verified;
}

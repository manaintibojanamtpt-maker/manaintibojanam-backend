/**
 * Which tenants a POS terminal may bind to.
 *
 * `selectPosTenants` is the filter the endpoint applies to the caller's raw
 * memberships, and it is where a privilege escalation would enter: if a
 * membership without a role were treated as "any staff", then any signed-in
 * account could trade in a restaurant it was merely associated with.
 */

import { it, describe } from 'node:test';
import assert from 'node:assert/strict';

import { POS_TENANT_ROLES, selectPosTenants, registerPosTenantRoutes } from '../../domain/posTenantRoutes';
import { resolveTenantMembershipsForUser } from '../../domain/tenantMembershipResolver';

describe('POS tenant selection', () => {
  it('keeps memberships whose role is meaningful at a counter', () => {
    const selected = selectPosTenants([
      { tenantId: 'tenant_owner', role: 'owner' },
      { tenantId: 'tenant_manager', role: 'manager' },
      { tenantId: 'tenant_cashier', role: 'cashier' },
      { tenantId: 'tenant_kitchen', role: 'kitchen' },
    ]);

    assert.deepEqual(
      selected.map((entry) => entry.tenantId).sort(),
      ['tenant_cashier', 'tenant_kitchen', 'tenant_manager', 'tenant_owner']
    );
  });

  it('drops a membership with no role instead of defaulting it to a staff role', () => {
    const selected = selectPosTenants([
      { tenantId: 'tenant_roleless' },
      { tenantId: 'tenant_blank', role: '   ' },
      { tenantId: 'tenant_real', role: 'cashier' },
    ]);

    assert.deepEqual(
      selected.map((entry) => entry.tenantId),
      ['tenant_real'],
      'an account that was never granted POS authority must not be able to trade'
    );
  });

  it('rejects roles that are not POS roles, whatever the source', () => {
    const selected = selectPosTenants([
      { tenantId: 'tenant_a', role: 'platform-admin' },
      { tenantId: 'tenant_b', role: 'customer' },
      { tenantId: 'tenant_c', role: 'delivery-partner' },
    ]);

    assert.deepEqual(selected, [], 'only POS counter roles may operate a terminal');
  });

  it('is case and whitespace insensitive on the role', () => {
    const selected = selectPosTenants([
      { tenantId: 'tenant_a', role: '  OWNER ' },
      { tenantId: 'tenant_b', role: 'Cashier' },
    ]);

    assert.equal(selected.length, 2);
    assert.equal(selected[0]?.role, 'owner');
    assert.equal(selected[1]?.role, 'cashier');
  });

  it('keeps the strongest role when a tenant appears more than once', () => {
    const selected = selectPosTenants([
      { tenantId: 'tenant_a', role: 'cashier' },
      { tenantId: 'tenant_a', role: 'owner' },
    ]);

    assert.equal(selected.length, 1, 'a tenant is offered once');
    assert.equal(selected[0]?.role, 'owner', 'the strongest role is the one shown and enforced');
  });

  it('ignores an empty or whitespace tenant id', () => {
    const selected = selectPosTenants([
      { tenantId: '', role: 'owner' },
      { tenantId: '   ', role: 'owner' },
      { tenantId: 'tenant_ok', role: 'owner' },
    ]);

    assert.deepEqual(
      selected.map((entry) => entry.tenantId),
      ['tenant_ok'],
      'an empty tenant id must never become a bindable tenant'
    );
  });

  it('returns a stable order so the picker does not reshuffle between loads', () => {
    const memberships = [
      { tenantId: 'tenant_z', role: 'owner' },
      { tenantId: 'tenant_a', role: 'owner' },
      { tenantId: 'tenant_m', role: 'owner' },
    ];

    const first = selectPosTenants(memberships);
    const second = selectPosTenants([...memberships].reverse());

    assert.deepEqual(first, second, 'order does not depend on the order memberships arrive in');
    assert.deepEqual(
      first.map((entry) => entry.tenantId),
      ['tenant_a', 'tenant_m', 'tenant_z']
    );
  });

  it('has no tenant id baked in to fall back on', () => {
    // The old behaviour was a hardcoded id. Asserting the set is empty of any
    // non-empty id is awkward; what matters is that an empty membership list
    // yields nothing at all.
    assert.deepEqual(selectPosTenants([]), []);
    assert.ok(POS_TENANT_ROLES.size >= 1);
  });
});

describe('POS tenant route handlers and membership isolation', () => {
  const setupApp = (options: {
    user?: { uid: string; email?: string; admin?: boolean; role?: string };
    memberships?: Array<{ tenantId: string; role?: string }>;
    names?: Record<string, string>;
    posEnabledMap?: Record<string, boolean>;
  }) => {
    const routes: Record<string, (req: any, res: any) => Promise<any>> = {};
    const mockApp = {
      get: (path: string, handler: any) => {
        routes[path] = handler;
      },
    } as any;

    registerPosTenantRoutes(mockApp, {
      verifyFirebaseToken: async (token: string) => {
        if (token === 'valid-token') {
          return options.user ?? { uid: 'user_1', email: 'user@example.com' };
        }
        throw new Error('invalid token');
      },
      getTenantMemberships: async (uid: string) => {
        if (uid === (options.user?.uid ?? 'user_1')) {
          return options.memberships ?? [];
        }
        return [];
      },
      getTenantName: async (tenantId: string) => options.names?.[tenantId] ?? null,
      isPosEnabled: async (tenantId: string) => options.posEnabledMap?.[tenantId] !== false,
    });

    const dispatch = async (path: string, params: Record<string, string> = {}, authHeader?: string) => {
      let statusCode = 200;
      let body: any = null;
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          body = data;
          return res;
        },
      };
      const req = {
        headers: authHeader ? { authorization: authHeader } : {},
        params,
      };

      const handler = routes[path];
      if (!handler) throw new Error(`Route ${path} not registered`);
      await handler(req, res);
      return { status: statusCode, body };
    };

    return { dispatch };
  };

  it('rejects unauthenticated requests with 401', async () => {
    const { dispatch } = setupApp({});
    const res = await dispatch('/api/v1/pos/tenants');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  });

  it('returns empty tenants list for unrelated user with no memberships', async () => {
    const { dispatch } = setupApp({
      user: { uid: 'unrelated_user', email: 'stranger@example.com' },
      memberships: [],
    });
    const res = await dispatch('/api/v1/pos/tenants', {}, 'Bearer valid-token');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.uid, 'unrelated_user');
    assert.deepEqual(res.body.tenants, []);
  });

  it('returns authorized tenants for legitimate staff and owners', async () => {
    const { dispatch } = setupApp({
      user: { uid: 'owner_user', email: 'owner@example.com' },
      memberships: [
        { tenantId: 'kitchen_1', role: 'owner' },
        { tenantId: 'kitchen_2', role: 'cashier' },
      ],
      names: { kitchen_1: 'Biryani Express', kitchen_2: 'Dosa Corner' },
    });
    const res = await dispatch('/api/v1/pos/tenants', {}, 'Bearer valid-token');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.tenants.length, 2);
    assert.equal(res.body.tenants[0].name, 'Biryani Express');
    assert.equal(res.body.tenants[0].role, 'owner');
    assert.equal(res.body.tenants[1].name, 'Dosa Corner');
    assert.equal(res.body.tenants[1].role, 'cashier');
  });

  it('confirms authorization for an authorized tenant', async () => {
    const { dispatch } = setupApp({
      user: { uid: 'cashier_user', email: 'cashier@example.com' },
      memberships: [{ tenantId: 'kitchen_1', role: 'cashier' }],
    });
    const res = await dispatch(
      '/api/v1/pos/tenants/:tenantId/authorized',
      { tenantId: 'kitchen_1' },
      'Bearer valid-token'
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.authorized, true);
    assert.equal(res.body.tenantId, 'kitchen_1');
    assert.equal(res.body.role, 'cashier');
  });

  it('denies authorization with 403 when user does not belong to the requested tenant', async () => {
    const { dispatch } = setupApp({
      user: { uid: 'user_a', email: 'usera@example.com' },
      memberships: [{ tenantId: 'kitchen_mine', role: 'owner' }],
    });
    const res = await dispatch(
      '/api/v1/pos/tenants/:tenantId/authorized',
      { tenantId: 'kitchen_foreign' },
      'Bearer valid-token'
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.authorized, false);
    assert.equal(res.body.error.code, 'FORBIDDEN_TENANT');
  });

  it('filters out POS-disabled tenants at the POS route boundary', async () => {
    const { dispatch } = setupApp({
      user: { uid: 'owner_user', email: 'owner@example.com' },
      memberships: [
        { tenantId: 'kitchen_enabled', role: 'owner' },
        { tenantId: 'kitchen_disabled', role: 'owner' },
      ],
      posEnabledMap: {
        kitchen_enabled: true,
        kitchen_disabled: false,
      },
      names: {
        kitchen_enabled: 'Kitchen Enabled',
        kitchen_disabled: 'Kitchen Disabled',
      },
    });
    const res = await dispatch('/api/v1/pos/tenants', {}, 'Bearer valid-token');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.tenants.length, 1, 'disabled tenant must be excluded from POS list');
    assert.equal(res.body.tenants[0].tenantId, 'kitchen_enabled');
  });

  it('defaults missing features.posEnabled to true', async () => {
    const { dispatch } = setupApp({
      user: { uid: 'owner_user', email: 'owner@example.com' },
      memberships: [{ tenantId: 'kitchen_default', role: 'owner' }],
      // kitchen_default is not in posEnabledMap, so defaults to true
      posEnabledMap: {},
      names: { kitchen_default: 'Kitchen Default' },
    });
    const res = await dispatch('/api/v1/pos/tenants', {}, 'Bearer valid-token');
    assert.equal(res.status, 200);
    assert.equal(res.body.tenants.length, 1);
    assert.equal(res.body.tenants[0].tenantId, 'kitchen_default');
  });

  it('denies /api/v1/pos/tenants/:tenantId/authorized with 403 POS_DISABLED when pos is disabled', async () => {
    const { dispatch } = setupApp({
      user: { uid: 'owner_user', email: 'owner@example.com' },
      memberships: [{ tenantId: 'kitchen_closed_pos', role: 'owner' }],
      posEnabledMap: { kitchen_closed_pos: false },
    });
    const res = await dispatch(
      '/api/v1/pos/tenants/:tenantId/authorized',
      { tenantId: 'kitchen_closed_pos' },
      'Bearer valid-token'
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.authorized, false);
    assert.equal(res.body.error.code, 'POS_DISABLED');
    assert.match(res.body.error.message, /Point of Sale is currently disabled/);
  });
});

describe('Tenant membership resolver and isolation', () => {
  const createMockDb = (config: {
    users?: Record<string, Record<string, any>>;
    tenants?: Record<string, Record<string, any>>;
    tenantsByOwnerId?: Record<string, Array<{ id: string; data: Record<string, any> }>>;
  }) => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const store = name === 'users' ? config.users : config.tenants;
          const data = store?.[id];
          return {
            exists: Boolean(data),
            data: () => data,
          };
        },
      }),
      where: (field: string, _op: string, value: any) => ({
        limit: (_n: number) => ({
          get: async () => {
            if (name === 'tenants' && field === 'ownerId') {
              const matches = config.tenantsByOwnerId?.[String(value)] ?? [];
              return {
                docs: matches.map((m) => ({
                  id: m.id,
                  data: () => m.data,
                })),
              };
            }
            return { docs: [] };
          },
        }),
      }),
    }),
  });

  it('resolves legitimate owner membership when tenantDoc.ownerId matches', async () => {
    const db = createMockDb({
      users: {
        user_owner: { ownedTenantIds: ['t_mine'] },
      },
      tenants: {
        t_mine: { ownerId: 'user_owner', name: 'My Kitchen' },
      },
    });

    const memberships = await resolveTenantMembershipsForUser('user_owner', db);
    assert.deepEqual(memberships, [{ tenantId: 't_mine', role: 'owner' }]);
  });

  it('falls back to querying tenants.where(ownerId == uid) when user doc has no memberships', async () => {
    const db = createMockDb({
      users: {
        user_fallback: {}, // empty memberships
      },
      tenants: {
        t_discovered: { ownerId: 'user_fallback', name: 'Discovered Kitchen' },
      },
      tenantsByOwnerId: {
        user_fallback: [{ id: 't_discovered', data: { ownerId: 'user_fallback' } }],
      },
    });

    const memberships = await resolveTenantMembershipsForUser('user_fallback', db);
    assert.deepEqual(memberships, [{ tenantId: 't_discovered', role: 'owner' }]);
  });

  it('drops candidate when claimed ownership was revoked on the tenant document', async () => {
    const db = createMockDb({
      users: {
        user_stale: { ownedTenantIds: ['t_transferred'] },
      },
      tenants: {
        t_transferred: { ownerId: 'new_owner', name: 'Transferred Kitchen' },
      },
    });

    const memberships = await resolveTenantMembershipsForUser('user_stale', db);
    assert.deepEqual(memberships, [], 'stale owner claiming transferred tenant must be dropped');
  });

  it('preserves retained staff role when ownership was revoked', async () => {
    const db = createMockDb({
      users: {
        user_demoted: {
          ownedTenantIds: ['t_store'],
          tenantRoles: { t_store: 'cashier' }, // legitimate retained staff role
        },
      },
      tenants: {
        t_store: { ownerId: 'new_owner', name: 'Store' },
      },
    });

    const memberships = await resolveTenantMembershipsForUser('user_demoted', db);
    assert.deepEqual(memberships, [{ tenantId: 't_store', role: 'cashier' }]);
  });

  it('does NOT filter out memberships when posEnabled === false (preserves general tenant access)', async () => {
    const db = createMockDb({
      users: {
        user_owner: { ownedTenantIds: ['t_disabled_pos'] },
      },
      tenants: {
        t_disabled_pos: {
          ownerId: 'user_owner',
          name: 'Closed POS Kitchen',
          features: { posEnabled: false }, // POS is turned off
        },
      },
    });

    const memberships = await resolveTenantMembershipsForUser('user_owner', db);
    assert.deepEqual(
      memberships,
      [{ tenantId: 't_disabled_pos', role: 'owner' }],
      'general membership resolver must preserve membership for order commands and settings'
    );
  });
});
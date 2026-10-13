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
import { registerOrderCommandRoutes } from '../registerOrderCommandRoutes';
import { createFakeFirestore, mockFieldValue } from './fakeFirestore';

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

describe('POS disablement and server-side command lifecycle on open terminal', () => {
  const setupCommandApp = (initialPosEnabled = true) => {
    let posEnabled = initialPosEnabled;
    const routes: Record<string, (req: any, res: any) => Promise<any>> = {};
    const mockApp = {
      post: (path: string, handler: any) => {
        routes[path] = handler;
      },
      get: (path: string, handler: any) => {
        routes[path] = handler;
      },
    } as any;

    const fakeDb = createFakeFirestore() as any;

    registerOrderCommandRoutes(mockApp, {
      db: fakeDb,
      fieldValue: mockFieldValue as any,
      verifyFirebaseToken: async (token: string) => {
        if (token === 'valid-token') {
          return { uid: 'user_cashier', email: 'cashier@example.com' };
        }
        throw new Error('invalid token');
      },
      getTenantMemberships: async () => [{ tenantId: 'tenant_1', role: 'cashier' }],
      isPosEnabled: async () => posEnabled,
    });

    const dispatchPost = async (
      path: string,
      params: Record<string, string>,
      body: any,
      headers: Record<string, string> = {}
    ) => {
      let statusCode = 200;
      let responseBody: any = null;
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
      };
      const req = {
        headers: {
          authorization: 'Bearer valid-token',
          ...headers,
        },
        params,
        body,
      };

      const handler = routes[path];
      if (!handler) throw new Error(`Route ${path} not registered`);
      await handler(req, res);
      return { status: statusCode, body: responseBody };
    };

    return {
      dispatchPost,
      fakeDb,
      setPosEnabled: (val: boolean) => {
        posEnabled = val;
      },
    };
  };

  const sampleCreateOrderBody = (commandId: string, orderId: string) => ({
    commandId,
    type: 'CreateOrder',
    tenantId: 'tenant_1',
    orderId,
    deviceId: 'pos_1',
    clientSequence: 1,
    clientTime: '2026-01-01T00:00:00.000Z',
    payload: {
      orderId,
      orderType: 'DINE_IN',
      paymentMethod: 'CASH',
      customer: { name: 'Walk-in', phone: '9000000000', tableNo: 'T1' },
      items: [{ itemId: 'item_1', name: 'Dosa', unitPrice: 100, quantity: 1 }],
      discountPercent: 0,
      gstPercent: 0,
    },
  });

  it('rejects CreateOrder with 503 POS_DISABLED when POS is disabled, but keeps error retryable', async () => {
    const { dispatchPost, setPosEnabled } = setupCommandApp(false);

    const cmdId = 'cmd_offline_create_1';
    const orderId = 'order_offline_1';
    const res = await dispatchPost(
      '/api/v1/tenants/:tenantId/orders/:orderId/commands',
      { tenantId: 'tenant_1', orderId },
      sampleCreateOrderBody(cmdId, orderId),
      { 'idempotency-key': cmdId }
    );

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'POS_DISABLED');
    assert.equal(res.body.error.retryable, true);
  });

  it('preserves non-POS order lifecycle operations even when POS is disabled', async () => {
    const { dispatchPost, fakeDb, setPosEnabled } = setupCommandApp(true);

    // 1. Create order while POS is enabled (representing an accepted order prior to disablement)
    const cmd1 = 'cmd_prior_create_1';
    const order1 = 'order_prior_1';
    const res1 = await dispatchPost(
      '/api/v1/tenants/:tenantId/orders/:orderId/commands',
      { tenantId: 'tenant_1', orderId: order1 },
      sampleCreateOrderBody(cmd1, order1),
      { 'idempotency-key': cmd1 }
    );
    assert.equal(res1.status, 200);
    assert.equal(res1.body.success, true);

    // 2. Disable POS via owner toggle
    setPosEnabled(false);

    // 3. Mark preparing / update status (non-POS lifecycle operation) on the accepted order
    const cmd2 = 'cmd_status_update_2';
    const res2 = await dispatchPost(
      '/api/v1/tenants/:tenantId/orders/:orderId/commands',
      { tenantId: 'tenant_1', orderId: order1 },
      {
        commandId: cmd2,
        type: 'UpdateOrderStatus',
        tenantId: 'tenant_1',
        orderId: order1,
        deviceId: 'pos_1',
        clientSequence: 2,
        clientTime: '2026-01-01T00:01:00.000Z',
        payload: {
          status: 'PREPARING',
          notes: 'Kitchen working on accepted order',
        },
      },
      { 'idempotency-key': cmd2 }
    );

    assert.equal(res2.status, 200, 'non-POS lifecycle operation must succeed while POS is disabled');
    assert.equal(res2.body.success, true);
  });

  it('re-enabling POS allows queued command to flush with identical idempotencyKey and no duplicate execution', async () => {
    const { dispatchPost, setPosEnabled } = setupCommandApp(true);

    // Step A: Queue command while POS is disabled
    setPosEnabled(false);
    const cmdId = 'cmd_queued_reconnect';
    const orderId = 'order_queued_reconnect';

    // Flush attempt while disabled -> 503 retryable
    const attempt1 = await dispatchPost(
      '/api/v1/tenants/:tenantId/orders/:orderId/commands',
      { tenantId: 'tenant_1', orderId },
      sampleCreateOrderBody(cmdId, orderId),
      { 'idempotency-key': cmdId }
    );
    assert.equal(attempt1.status, 503);
    assert.equal(attempt1.body.error.retryable, true);

    // Step B: Owner re-enables POS in portal
    setPosEnabled(true);

    // Step C: Terminal flushes queued command with identical idempotency key
    const attempt2 = await dispatchPost(
      '/api/v1/tenants/:tenantId/orders/:orderId/commands',
      { tenantId: 'tenant_1', orderId },
      sampleCreateOrderBody(cmdId, orderId),
      { 'idempotency-key': cmdId }
    );
    assert.equal(attempt2.status, 200);
    assert.equal(attempt2.body.success, true);
    assert.equal(attempt2.body.orderId, orderId);

    // Step D: Replay / duplicate flush attempt with same idempotency key
    const attempt3 = await dispatchPost(
      '/api/v1/tenants/:tenantId/orders/:orderId/commands',
      { tenantId: 'tenant_1', orderId },
      sampleCreateOrderBody(cmdId, orderId),
      { 'idempotency-key': cmdId }
    );
    assert.equal(attempt3.status, 200);
    assert.equal(attempt3.body.replayed, true, 'server must return receipt with no duplicate execution');
  });
});
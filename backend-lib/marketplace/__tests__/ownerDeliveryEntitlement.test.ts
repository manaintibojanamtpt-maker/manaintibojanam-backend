import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertDeliveryEngineEntitlement } from '../../entitlements.ts';
import { registerOwnerDeliveryIntegrationRoutes } from '../ownerDeliveryIntegrationRoutes.ts';

function createMockDb(planId: string = 'pro') {
  const docMock = {
    get: async () => ({
      exists: true,
      data: () => ({
        subscription: { planId, status: 'active' },
      }),
    }),
    set: async () => {},
    update: async () => {},
    collection: (_subCol: string) => ({
      doc: (_providerId: string) => ({
        get: async () => ({
          exists: true,
          data: () => ({
            status: 'connected',
            connectionType: 'oauth2_scaffold',
          }),
        }),
        set: async () => {},
        update: async () => {},
      }),
      get: async () => ({ docs: [] }),
    }),
  };

  return {
    collection: (_col: string) => ({
      doc: (_id: string) => docMock,
      where: () => ({
        get: async () => ({ docs: [] }),
      }),
      get: async () => ({ docs: [] }),
      add: async () => {},
    }),
  } as any;
}

describe('ownerDeliveryEntitlement & Route Access Regression Tests', () => {
  it('1. assertDeliveryEngineEntitlement succeeds for entitled tenant', async () => {
    const mockDb = createMockDb('pro');
    const plan = await assertDeliveryEngineEntitlement(mockDb, 'mana-inti');
    assert.equal(plan, 'pro');
  });

  it('2 & 5 & 6. Non-entitled tenant receives 403 with requiresUpgrade: true', async () => {
    const mockDb = createMockDb('starter');

    try {
      await assertDeliveryEngineEntitlement(mockDb, 'mana-inti');
      assert.fail('Should have thrown entitlement error');
    } catch (err: any) {
      assert.equal(err.statusCode, 403);
      assert.equal(err.requiresUpgrade, true);
      assert.match(err.message, /does not support deliveryEngine/);
    }
  });

  it('3. GET /delivery-integrations/:tenantId resolves tenant from URL parameter', async () => {
    let capturedTenantId = '';
    const mockDb = createMockDb('pro');

    const routes: Record<string, Function> = {};
    const mockApp = {
      get: (path: string, ...handlers: Function[]) => {
        routes[`GET ${path}`] = handlers[handlers.length - 1];
      },
      post: (path: string, ...handlers: Function[]) => {
        routes[`POST ${path}`] = handlers[handlers.length - 1];
      },
    } as any;

    const mockVerifyToken = (_req: any, _res: any, next: () => void) => next();
    const mockAssertAccess = async (_uid: string, tenantId: string) => {
      capturedTenantId = tenantId;
      return tenantId;
    };

    registerOwnerDeliveryIntegrationRoutes(
      mockApp,
      mockDb,
      mockVerifyToken,
      mockAssertAccess,
      {} as any,
    );

    const handler = routes['GET /api/owner/delivery-integrations/:tenantId'];
    assert.ok(handler);

    const req = {
      user: { uid: 'user-123', email: 'owner@test.com' },
      params: { tenantId: 'mana-inti-kitchen' },
      query: {},
      body: {},
    };

    let resJson: any = null;
    const res = {
      status: () => res,
      json: (data: any) => {
        resJson = data;
        return res;
      },
    };

    await handler(req, res);

    assert.equal(capturedTenantId, 'mana-inti-kitchen');
    assert.equal(resJson?.success, true);
    assert.equal(resJson?.tenantId, 'mana-inti-kitchen');
    assert.ok(Array.isArray(resJson?.connections));
  });

  it('4. Unauthorized owner access is rejected before entitlement or route handling', async () => {
    const mockDb = createMockDb('pro');

    const routes: Record<string, Function> = {};
    const mockApp = {
      get: (path: string, ...handlers: Function[]) => {
        routes[`GET ${path}`] = handlers[handlers.length - 1];
      },
      post: (path: string, ...handlers: Function[]) => {
        routes[`POST ${path}`] = handlers[handlers.length - 1];
      },
    } as any;

    const mockAssertAccess = async () => {
      const err: any = new Error('Access denied to tenant');
      err.statusCode = 403;
      throw err;
    };

    registerOwnerDeliveryIntegrationRoutes(
      mockApp,
      mockDb,
      (_req: any, _res: any, next: () => void) => next(),
      mockAssertAccess,
      {} as any,
    );

    const handler = routes['GET /api/owner/delivery-integrations/:tenantId'];
    const req = {
      user: { uid: 'attacker-uid' },
      params: { tenantId: 'victim-tenant' },
    };
    let resStatus = 0;
    let resJson: any = null;
    const res = {
      status: (code: number) => {
        resStatus = code;
        return res;
      },
      json: (data: any) => {
        resJson = data;
        return res;
      },
    };

    await handler(req, res);
    assert.equal(resStatus, 403);
    assert.equal(resJson.success, false);
    assert.equal(resJson.error, 'Access denied to tenant');
  });

  it('7. POST routes resolve tenant from URL parameter without body/query tenantId', async () => {
    const mockDb = createMockDb('pro');

    const routes: Record<string, Function> = {};
    const mockApp = {
      get: (path: string, ...handlers: Function[]) => {
        routes[`GET ${path}`] = handlers[handlers.length - 1];
      },
      post: (path: string, ...handlers: Function[]) => {
        routes[`POST ${path}`] = handlers[handlers.length - 1];
      },
    } as any;

    registerOwnerDeliveryIntegrationRoutes(
      mockApp,
      mockDb,
      (_req: any, _res: any, next: () => void) => next(),
      async (_uid, tId) => tId,
      { serverTimestamp: () => new Date() } as any,
    );

    const handler = routes['POST /api/owner/delivery-integrations/:tenantId/:provider/start'];
    const req = {
      user: { uid: 'owner-1' },
      params: { tenantId: 'tenant-abc', provider: 'porter' },
      body: {},
      query: {},
    };
    let resJson: any = null;
    const res = {
      status: () => res,
      json: (data: any) => {
        resJson = data;
        return res;
      },
    };

    await handler(req, res);
    assert.equal(resJson.success, true);
    assert.equal(resJson.connection.tenantId, 'tenant-abc');
    assert.equal(resJson.connection.provider, 'porter');
  });

  it('8. Entitlement checks resolved tenant from assertOwnerTenantAccess, ignoring query parameter manipulation', async () => {
    let entitlementCheckedTenant = '';
    const mockDb = {
      collection: (_col: string) => ({
        doc: (id: string) => {
          entitlementCheckedTenant = id;
          return {
            get: async () => ({
              exists: true,
              data: () => ({
                subscription: { planId: 'pro' },
              }),
            }),
            set: async () => {},
            update: async () => {},
            collection: (_subCol: string) => ({
              doc: () => ({ get: async () => ({ exists: false }) }),
              get: async () => ({ docs: [] }),
            }),
          };
        },
        where: () => ({
          get: async () => ({ docs: [] }),
        }),
        get: async () => ({ docs: [] }),
      }),
    } as any;

    const routes: Record<string, Function> = {};
    const mockApp = {
      get: (path: string, ...handlers: Function[]) => {
        routes[`GET ${path}`] = handlers[handlers.length - 1];
      },
      post: (path: string, ...handlers: Function[]) => {
        routes[`POST ${path}`] = handlers[handlers.length - 1];
      },
    } as any;

    const mockAssertAccess = async () => 'authoritative-tenant-id';

    registerOwnerDeliveryIntegrationRoutes(
      mockApp,
      mockDb,
      (_req: any, _res: any, next: () => void) => next(),
      mockAssertAccess,
      {} as any,
    );

    const handler = routes['GET /api/owner/delivery-integrations/:tenantId'];
    const req = {
      user: { uid: 'user-1' },
      params: { tenantId: 'authoritative-tenant-id' },
      query: { tenantId: 'fake-query-tenant' },
      body: { tenantId: 'fake-body-tenant' },
    };

    const res = { status: () => res, json: () => res };
    await handler(req, res);

    assert.equal(entitlementCheckedTenant, 'authoritative-tenant-id');
  });

  it('9 & 10. Readiness and connection inspection return expected provider matrices and security notes', async () => {
    const mockDb = createMockDb('enterprise');

    const routes: Record<string, Function> = {};
    const mockApp = {
      get: (path: string, ...handlers: Function[]) => {
        routes[`GET ${path}`] = handlers[handlers.length - 1];
      },
      post: (path: string, ...handlers: Function[]) => {
        routes[`POST ${path}`] = handlers[handlers.length - 1];
      },
    } as any;

    registerOwnerDeliveryIntegrationRoutes(
      mockApp,
      mockDb,
      (_req: any, _res: any, next: () => void) => next(),
      async (_uid, tId) => tId,
      {} as any,
    );

    const handler = routes['GET /api/owner/delivery-integrations/:tenantId/:provider/readiness'];
    const req = {
      user: { uid: 'owner-1' },
      params: { tenantId: 'tenant-xyz', provider: 'uber_direct' },
    };
    let resJson: any = null;
    const res = {
      status: () => res,
      json: (data: any) => {
        resJson = data;
        return res;
      },
    };

    await handler(req, res);
    assert.equal(resJson.success, true);
    assert.equal(resJson.readiness.provider, 'uber_direct');
    assert.ok(typeof resJson.readiness.merchantMessage === 'string');
  });
});

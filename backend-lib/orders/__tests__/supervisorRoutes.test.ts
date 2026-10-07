import { it, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeFirestore, mockFieldValue } from './fakeFirestore';
import { registerSupervisorRoutes } from '../registerSupervisorRoutes';
import { setSupervisorCredential } from '../supervisorVerification';
import { SUPERVISOR_OPERATIONS } from '../supervisorVerification';

interface VerifiedUser {
  uid: string;
  admin?: boolean;
  email?: string;
  role?: string;
}

const TENANT = 'tenant_supervisor_test';
const OPERATION = 'REOPEN_BUSINESS_DAY';
const CODE = '123456';
const ADMIN_UID = 'admin_1';
const STAFF_UID = 'staff_1';
const OTHER_UID = 'other_1';

const goodCodeResult = { ok: true, grant: { token: 'grant-token', operation: OPERATION, tenantId: 'tenant', actorUid: 'staff_1', expiresAt: Date.now() + 3600000 } };

const setupApp = () => {
  const db = createFakeFirestore();
  const fakeApp = {
    routes: new Map<string, { method: string; handler: Function }>(),
    post(path: string, handler: Function) {
      this.routes.set(path, { method: 'POST', handler });
    },
    get(path: string, handler: Function) {
      this.routes.set(path, { method: 'GET', handler });
    },
    use(path: string, handler: Function) {
      this.routes.set(path, { method: 'USE', handler });
    },
  };

  registerSupervisorRoutes(fakeApp as any, {
    db: db as any,
    fieldValue: mockFieldValue,
    verifyFirebaseToken: async (token: string): Promise<VerifiedUser> => {
      if (!token || token === 'bad') throw new Error('invalid');
      return { uid: token, email: `${token}@test.com` };
    },
    getTenantMemberships: async (uid: string) => {
      if (uid === ADMIN_UID) return [{ tenantId: TENANT, role: 'owner' }];
      if (uid === STAFF_UID) return [{ tenantId: TENANT, role: 'cashier' }];
      if (uid === OTHER_UID) return [{ tenantId: 'other_tenant', role: 'cashier' }];
      return [];
    },
    getOwnedTenantIds: async (uid: string) => (uid === ADMIN_UID ? [TENANT] : []),
  });

  return { db, app: fakeApp };
};

const makeReq = (overrides: Record<string, unknown> = {}) => ({
  params: { tenantId: TENANT },
  body: { code: CODE, operation: OPERATION },
  headers: { authorization: `Bearer ${STAFF_UID}`, 'x-correlation-id': 'test-corr' },
  ...overrides,
});

const makeRes = () => {
  let statusCode = 200;
  let body: any;
  const res: any = {
    status(code: number) { statusCode = code; return res; },
    json(data: any) { body = data; return res; },
    setHeader(name: string, value: string) {},
    get statusCode() { return statusCode; },
    get body() { return body; },
  };
  return { res, getBody: () => body, getStatus: () => statusCode };
};

describe('supervisor routes', () => {
  it('rejects unauthenticated request', async () => {
    const { app } = setupApp();
    const route = app.routes.get('/api/v1/tenants/:tenantId/pos/verify-supervisor');
    assert.ok(route, 'route registered');

    const { res, getStatus, getBody } = makeRes();
    const req = makeReq({ headers: {} });

    await route.handler(req, res);
    assert.equal(getStatus(), 401);
    assert.equal(getBody().success, false);
    assert.equal(getBody().error.code, 'UNAUTHENTICATED');
  });

  it('rejects invalid token', async () => {
    const { app } = setupApp();
    const route = app.routes.get('/api/v1/tenants/:tenantId/pos/verify-supervisor');
    assert.ok(route);

    const { res, getStatus, getBody } = makeRes();
    const req = makeReq({ headers: { authorization: 'Bearer bad' } });

    await route.handler(req, res);
    assert.equal(getStatus(), 401);
    assert.equal(getBody().error.code, 'UNAUTHENTICATED');
  });

  it('rejects tenant the caller does not belong to', async () => {
    const { app, db } = setupApp();
    await setSupervisorCredential(db as any, mockFieldValue, {
      tenantId: 'other_tenant',
      code: CODE,
      actorUid: 'owner_1',
    });

    const route = app.routes.get('/api/v1/tenants/:tenantId/pos/verify-supervisor');
    assert.ok(route);

    const { res, getStatus, getBody } = makeRes();
    const req = makeReq({ params: { tenantId: 'other_tenant' } });

    await route.handler(req, res);
    assert.equal(getStatus(), 403);
    assert.equal(getBody().error.code, 'FORBIDDEN_TENANT');
  });

  it('rejects invalid operation', async () => {
    const { app } = setupApp();
    const route = app.routes.get('/api/v1/tenants/:tenantId/pos/verify-supervisor');
    assert.ok(route);

    const { res, getStatus, getBody } = makeRes();
    const req = makeReq({ body: { code: CODE, operation: 'INVALID_OP' } });

    await route.handler(req, res);
    assert.equal(getStatus(), 400);
    assert.equal(getBody().error.code, 'INVALID_OPERATION');
  });

  it('rejects wrong code', async () => {
    const { app, db } = setupApp();
    await setSupervisorCredential(db as any, mockFieldValue, {
      tenantId: TENANT,
      code: 'correct-code',
      actorUid: 'owner_1',
    });

    const route = app.routes.get('/api/v1/tenants/:tenantId/pos/verify-supervisor');
    assert.ok(route);

    const { res, getStatus, getBody } = makeRes();
    const req = makeReq({ body: { code: 'wrong-code', operation: OPERATION } });

    await route.handler(req, res);
    assert.equal(getStatus(), 401);
    assert.equal(getBody().error.code, 'INVALID_CODE');
  });

  it('issues a grant on correct code and logs retry-after on rate limit', async () => {
    const { app, db } = setupApp();
    await setSupervisorCredential(db as any, mockFieldValue, {
      tenantId: TENANT,
      code: CODE,
      actorUid: 'owner_1',
    });

    const route = app.routes.get('/api/v1/tenants/:tenantId/pos/verify-supervisor');
    assert.ok(route);

    const { res, getStatus, getBody } = makeRes();
    const req = makeReq({ body: { code: CODE, operation: OPERATION } });

    await route.handler(req, res);
    assert.equal(getStatus(), 200);
    assert.equal(getBody().success, true);
    assert.equal(getBody().verified, true);
    assert.ok(getBody().grant.token);
    assert.equal(getBody().grant.operation, OPERATION);
    assert.equal(getBody().grant.tenantId, TENANT);
    assert.equal(getBody().grant.actorUid, STAFF_UID);
  });

  it('redeems a grant once', async () => {
    const { app, db } = setupApp();
    await setSupervisorCredential(db as any, mockFieldValue, {
      tenantId: TENANT,
      code: CODE,
      actorUid: 'owner_1',
    });

    const verifyRoute = app.routes.get('/api/v1/tenants/:tenantId/pos/verify-supervisor');
    assert.ok(verifyRoute);

    const { res: vRes, getBody: vBody } = makeRes();
    await verifyRoute.handler(makeReq(), vRes);
    const grant = vBody().grant;
    assert.ok(grant);

    const redeemRoute = app.routes.get('/api/v1/tenants/:tenantId/pos/supervisor-grants/redeem');
    assert.ok(redeemRoute);

    const { res: rRes, getStatus: rStatus, getBody: rBody } = makeRes();
    const redeemReq = makeReq({ body: { token: grant.token, operation: OPERATION } });
    await redeemRoute.handler(redeemReq, rRes);
    assert.equal(rStatus(), 200);
    assert.equal(rBody().success, true);

    const { res: r2Res, getStatus: r2Status, getBody: r2Body } = makeRes();
    await redeemRoute.handler(redeemReq, r2Res);
    assert.equal(r2Status(), 401);
    assert.equal(r2Body().error.code, 'GRANT_CONSUMED');
  });

  it('rejects grant from different tenant', async () => {
    const { app, db } = setupApp();
    await setSupervisorCredential(db as any, mockFieldValue, {
      tenantId: 'other_tenant',
      code: CODE,
      actorUid: 'owner_1',
    });

    const verifyRoute = app.routes.get('/api/v1/tenants/:tenantId/pos/verify-supervisor');
    assert.ok(verifyRoute);

    const { res: vRes, getBody: vBody } = makeRes();
    const verifyReq = makeReq({ params: { tenantId: 'other_tenant' }, headers: { authorization: `Bearer ${OTHER_UID}`, 'x-correlation-id': 'test-corr' } });
    await verifyRoute.handler(verifyReq, vRes);
    const grant = vBody().grant;
    assert.ok(grant);

    const redeemRoute = app.routes.get('/api/v1/tenants/:tenantId/pos/supervisor-grants/redeem');
    assert.ok(redeemRoute);

    const { res: rRes, getStatus: rStatus, getBody: rBody } = makeRes();
    // Try to redeem the grant from the original tenant (TENANT) instead of other_tenant
    const redeemReq = makeReq({ params: { tenantId: TENANT }, body: { token: grant.token, operation: OPERATION } });
    await redeemRoute.handler(redeemReq, rRes);
    assert.equal(rStatus(), 403);
    assert.equal(rBody().error.code, 'GRANT_MISMATCH');
  });

  it('rejects grant for different operation', async () => {
    const { app, db } = setupApp();
    await setSupervisorCredential(db as any, mockFieldValue, {
      tenantId: TENANT,
      code: CODE,
      actorUid: 'owner_1',
    });

    const verifyRoute = app.routes.get('/api/v1/tenants/:tenantId/pos/verify-supervisor');
    assert.ok(verifyRoute);

    const { res: vRes, getBody: vBody } = makeRes();
    await verifyRoute.handler(makeReq({ body: { code: CODE, operation: 'RESOLVE_PRICING_REVIEW' } }), vRes);
    const grant = vBody().grant;
    assert.ok(grant);

    const redeemRoute = app.routes.get('/api/v1/tenants/:tenantId/pos/supervisor-grants/redeem');
    assert.ok(redeemRoute);

    const { res: rRes, getStatus: rStatus, getBody: rBody } = makeRes();
    const redeemReq = makeReq({ body: { token: grant.token, operation: OPERATION } });
    await redeemRoute.handler(redeemReq, rRes);
    assert.equal(rStatus(), 403);
    assert.equal(rBody().error.code, 'GRANT_MISMATCH');
  });

  it('returns 500 when verifyFirebaseToken is not configured', async () => {
    const { app } = setupApp();
    const route = app.routes.get('/api/v1/tenants/:tenantId/pos/verify-supervisor');
    assert.ok(route);

    // Overwrite with an app that has no verifyFirebaseToken
    const db = createFakeFirestore();
    const fakeApp = {
      routes: new Map(),
      post(path: string, handler: Function) { this.routes.set(path, { method: 'POST', handler }); },
    };
    registerSupervisorRoutes(fakeApp as any, {
      db: createFakeFirestore() as any,
      fieldValue: mockFieldValue,
    });

    const route2 = fakeApp.routes.get('/api/v1/tenants/:tenantId/pos/verify-supervisor');
    assert.ok(route2);

    const { res, getStatus, getBody } = makeRes();
    const req = makeReq({ headers: { authorization: 'Bearer good' } });
    await route2.handler(req, res);
    assert.equal(getStatus(), 500);
    assert.equal(getBody().success, false);
    assert.equal(getBody().error.code, 'UNAUTHENTICATED');
  });
});
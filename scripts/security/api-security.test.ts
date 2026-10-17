/**
 * M0 PR-6 — API order security matrix (library-level integration).
 * Run: npm run test:api-security
 *
 * Optional live probes: SECURITY_TEST_BASE_URL=http://localhost:8080
 */

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
  assertOrderNotifyAccess,
  assertOrderReadAccess,
  assertOrderUserListAccess,
  assertRazorpayDraftBindAccess,
  isOrderAuthEnforced,
  isRazorpayDraftBindEnforced,
} from '../../backend-lib/orderAccess';
import {
  signGuestOrderToken,
  verifyGuestOrderToken,
} from '../../backend-lib/guestOrderToken';

const TEST_SECRET = 'security-test-guest-secret-32-chars!!';
const LIVE_BASE = process.env.SECURITY_TEST_BASE_URL?.replace(/\/$/, '');

before(() => {
  process.env.ORDER_GUEST_TOKEN_SECRET = TEST_SECRET;
  delete process.env.FF_ORDER_AUTH_ENFORCE;
  delete process.env.FF_RAZORPAY_DRAFT_BIND;
});

after(() => {
  delete process.env.ORDER_GUEST_TOKEN_SECRET;
  delete process.env.FF_ORDER_AUTH_ENFORCE;
  delete process.env.FF_RAZORPAY_DRAFT_BIND;
});

describe('M0 API security matrix (order access)', () => {
  const order = { userId: 'customer-1', tenantId: 'tenant-1' };

  it('defaults FF_ORDER_AUTH_ENFORCE to true', () => {
    assert.equal(isOrderAuthEnforced(), true);
  });

  it('defaults FF_RAZORPAY_DRAFT_BIND to true', () => {
    assert.equal(isRazorpayDraftBindEnforced(), true);
  });

  it('denies unauthenticated order read decisions with 401', async () => {
    const decision = await assertOrderReadAccess({
      requestedOrderId: 'order-1',
      order,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 401);
  });

  it('allows guest JWT order read access', async () => {
    const { token } = signGuestOrderToken('order-guest', { secret: TEST_SECRET });
    verifyGuestOrderToken(token, 'order-guest', { secret: TEST_SECRET });

    const decision = await assertOrderReadAccess({
      requestedOrderId: 'order-guest',
      order: { userId: null, tenantId: 'tenant-1' },
      guestToken: token,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'guest_token');
  });

  it('denies cross-user order listing', () => {
    const decision = assertOrderUserListAccess({ uid: 'user-a' }, 'user-b');
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
  });

  it('allows self order listing', () => {
    const decision = assertOrderUserListAccess({ uid: 'user-a' }, 'user-a');
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'self');
  });

  it('denies customer notify-status access', async () => {
    const decision = await assertOrderNotifyAccess({
      firebaseUser: { uid: 'customer-1' },
      order,
      getOwnedTenantIds: async () => [],
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
  });

  it('allows tenant owner notify-status access', async () => {
    const decision = await assertOrderNotifyAccess({
      firebaseUser: { uid: 'owner-1' },
      order,
      getOwnedTenantIds: async () => ['tenant-1'],
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'tenant_owner');
  });

  it('allows guest razorpay draft bind without auth', async () => {
    const decision = await assertRazorpayDraftBindAccess({ draftUserId: null });
    assert.equal(decision.allowed, true);
  });

  it('denies cross-user razorpay draft bind', async () => {
    const decision = await assertRazorpayDraftBindAccess({
      draftUserId: 'customer-1',
      authHeader: 'Bearer token',
      verifyFirebaseToken: async () => ({ uid: 'other-user' }),
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
  });
});

describe('optional live API probes', { skip: !LIVE_BASE }, () => {
  const tenantHeaders = { 'x-tenant-id': 'demo-biryani-house' };

  it('GET /api/orders/:id without auth respects enforce flag', async () => {
    const response = await fetch(`${LIVE_BASE}/api/orders/does-not-exist`, { headers: tenantHeaders });
    if (isOrderAuthEnforced()) {
      assert.ok([401, 403, 404].includes(response.status));
    } else {
      assert.ok([200, 404].includes(response.status));
    }
  });

  it('POST /api/orders/:id/notify-status without auth returns 401', async () => {
    const response = await fetch(`${LIVE_BASE}/api/orders/test-order/notify-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...tenantHeaders },
      body: JSON.stringify({ status: 'PLACED' }),
    });
    assert.equal(response.status, 401);
  });

  it('GET /api/orders/user/:userId without auth returns 401', async () => {
    const response = await fetch(`${LIVE_BASE}/api/orders/user/some-user-id`, { headers: tenantHeaders });
    assert.equal(response.status, 401);
  });

  describe('Marketplace Tenant Middleware & Authorization Boundaries', () => {
    it('public menu endpoint is accessible without x-tenant-id header', async () => {
      const response = await fetch(`${LIVE_BASE}/api/marketplace/restaurants/demo-biryani-house/menu`);
      assert.equal(response.status, 200);
      const data = await response.json() as any;
      assert.equal(data.ok, true);
      assert.ok(Array.isArray(data.value?.items));
      assert.ok(data.value.items.length >= 1);
    });

    it('public restaurant endpoint with unknown slug returns 404', async () => {
      const response = await fetch(`${LIVE_BASE}/api/marketplace/restaurants/nonexistent-kitchen-xyz/menu`);
      assert.equal(response.status, 404);
      const data = await response.json() as any;
      assert.equal(data.ok, false);
      assert.equal(data.error?.code, 'NOT_FOUND');
    });

    it('protected marketplace orders endpoint strictly returns 401 without auth token', async () => {
      const response = await fetch(`${LIVE_BASE}/api/marketplace/orders`);
      assert.equal(response.status, 401);
    });

    it('protected checkout capabilities endpoint strictly returns 401 without auth token', async () => {
      const response = await fetch(`${LIVE_BASE}/api/marketplace/checkout/capabilities`);
      assert.equal(response.status, 401);
    });

    it('non-exempt API route with invalid tenantId strictly returns 400 "Invalid Tenant ID"', async () => {
      const response = await fetch(`${LIVE_BASE}/api/menu?tenantId=nonexistent-tenant-xyz`);
      assert.equal(response.status, 400);
      const data = await response.json() as any;
      assert.equal(data.success, false);
      assert.equal(data.error, 'Invalid Tenant ID');
    });
  });
});

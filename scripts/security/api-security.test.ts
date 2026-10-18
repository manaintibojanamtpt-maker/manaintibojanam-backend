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
  getGuestTokenSecret,
  signGuestOrderToken,
  verifyGuestOrderToken,
} from '../../backend-lib/guestOrderToken';
import { FirebaseAdminProvider } from '../../backend-lib/firebase/FirebaseAdminProvider.js';

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

  it('strictly throws MISSING_SECRET if ORDER_GUEST_TOKEN_SECRET is missing or short', () => {
    delete process.env.ORDER_GUEST_TOKEN_SECRET;
    assert.throws(
      () => getGuestTokenSecret(),
      (err: any) => err.code === 'MISSING_SECRET'
    );
    process.env.ORDER_GUEST_TOKEN_SECRET = 'short';
    assert.throws(
      () => getGuestTokenSecret(),
      (err: any) => err.code === 'MISSING_SECRET'
    );
    process.env.ORDER_GUEST_TOKEN_SECRET = TEST_SECRET;
    assert.equal(getGuestTokenSecret(), TEST_SECRET);
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

    it('mutating POST on catalog route with invalid tenantId is NOT exempted and returns 400', async () => {
      const response = await fetch(`${LIVE_BASE}/api/marketplace/restaurants/demo-biryani-house/menu?tenantId=nonexistent-tenant-xyz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Malicious Item' }),
      });
      assert.equal(response.status, 400);
      const data = await response.json() as any;
      assert.equal(data.success, false);
      assert.equal(data.error, 'Invalid Tenant ID');
    });

    it('guest tracking without Authorization header returns 401 GUEST_TOKEN_REQUIRED', async () => {
      const response = await fetch(`${LIVE_BASE}/api/marketplace/orders/test-order/guest-tracking?phone=9876543210`);
      assert.equal(response.status, 401);
      const data = await response.json() as any;
      assert.equal(data.ok, false);
      assert.equal(data.error?.code, 'GUEST_TOKEN_REQUIRED');
    });

    it('guest tracking with forged/invalid token returns 401 INVALID_TOKEN', async () => {
      const response = await fetch(`${LIVE_BASE}/api/marketplace/orders/test-order/guest-tracking?phone=9876543210`, {
        headers: { Authorization: 'Guest forged-invalid-guest-token' },
      });
      assert.equal(response.status, 401);
      const data = await response.json() as any;
      assert.equal(data.ok, false);
      assert.ok(['INVALID_TOKEN', 'GUEST_TOKEN_REQUIRED'].includes(data.error?.code));
    });

    it('guest tracking with valid signed token enforces order and phone verification', async () => {
      const { token } = signGuestOrderToken('valid-order-123', { secret: getGuestTokenSecret() });
      const response = await fetch(`${LIVE_BASE}/api/marketplace/orders/valid-order-123/guest-tracking?phone=9876543210`, {
        headers: { Authorization: `Guest ${token}` },
      });
      // Order doesn't exist in emulator, so token passes cryptographic verification and returns 404
      assert.equal(response.status, 404);
      const data = await response.json() as any;
      assert.equal(data.ok, false);
      assert.equal(data.error?.code, 'NOT_FOUND');
    });

    it('guest tracking against a real seeded order succeeds with 200 and tracking details', async () => {
      const provider = await FirebaseAdminProvider.initialize();
      const db = provider.getFirestore();
      const testOrderId = 'order-live-seeded-1';
      await db.collection('orders').doc(testOrderId).set({
        tenantId: 'demo-biryani-house',
        phone: '9876543210',
        orderNumber: 101,
        status: 'PLACED',
        customerName: 'Test Customer',
        deliveryAddress: 'Flat 101, Test Residency, Hyderabad',
        items: [
          { name: 'Hyderabadi Chicken Biryani', quantity: 2, price: 498 }
        ],
        createdAt: new Date().toISOString(),
      });

      const { token } = signGuestOrderToken(testOrderId, { secret: getGuestTokenSecret() });
      const response = await fetch(`${LIVE_BASE}/api/marketplace/orders/${testOrderId}/guest-tracking?phone=9876543210`, {
        headers: { Authorization: `Guest ${token}` },
      });
      assert.equal(response.status, 200);
      const data = await response.json() as any;
      assert.equal(data.ok, true);
      assert.equal(data.value?.orderId, testOrderId);
      assert.equal(data.value?.status, 'PLACED');
    });

    it('guest tracking with token for order-1 rejected against order-2 with 401 ORDER_MISMATCH', async () => {
      const { token } = signGuestOrderToken('order-live-seeded-1', { secret: getGuestTokenSecret() });
      const response = await fetch(`${LIVE_BASE}/api/marketplace/orders/order-mismatch-target/guest-tracking?phone=9876543210`, {
        headers: { Authorization: `Guest ${token}` },
      });
      assert.equal(response.status, 401);
      const data = await response.json() as any;
      assert.equal(data.ok, false);
      assert.equal(data.error?.code, 'ORDER_MISMATCH');
    });

    it('legitimate checkout prepare and place succeeds and returns valid guest tracking token', async () => {
      const provider = await FirebaseAdminProvider.initialize();
      const db = provider.getFirestore();
      const menuSnap = await db.collection('menu').where('tenantId', '==', 'demo-biryani-house').get();
      assert.ok(menuSnap.docs.length > 0, 'Must have at least one seeded menu item');
      const testItemId = menuSnap.docs[0].id;

      // 1. Prepare checkout
      const prepareRes = await fetch(`${LIVE_BASE}/api/marketplace/checkout/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: 'demo-biryani-house',
          lines: [
            { itemId: testItemId, quantity: 1 }
          ],
        }),
      });
      assert.equal(prepareRes.status, 200);
      const prepareData = await prepareRes.json() as any;
      assert.equal(prepareData.ok, true);
      assert.ok(Array.isArray(prepareData.value?.paymentMethods));
      assert.ok(prepareData.value.paymentMethods.includes('cod'));
      assert.ok(prepareData.value?.quote?.grandTotal > 0);

      // 2. Place order (COD)
      const placeRes = await fetch(`${LIVE_BASE}/api/marketplace/checkout/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: 'demo-biryani-house',
          lines: [
            { itemId: testItemId, quantity: 1 }
          ],
          paymentMethod: 'cod',
          customerName: 'Test Customer',
          phone: '9876543210',
          deliveryAddress: { formattedAddress: 'Flat 101, Test Residency, Hyderabad' },
        }),
      });
      assert.equal(placeRes.status, 200);
      const placeData = await placeRes.json() as any;
      assert.equal(placeData.ok, true);
      assert.ok(typeof placeData.value?.orderId === 'string');
      assert.ok(typeof placeData.value?.guestTrackingToken === 'string');

      // 3. Track newly placed order using returned guestTrackingToken
      const placedOrderId = placeData.value.orderId;
      const trackingRes = await fetch(`${LIVE_BASE}/api/marketplace/orders/${placedOrderId}/guest-tracking?phone=9876543210`, {
        headers: { Authorization: `Guest ${placeData.value.guestTrackingToken}` },
      });
      assert.equal(trackingRes.status, 200);
      const trackingData = await trackingRes.json() as any;
      assert.equal(trackingData.ok, true);
      assert.equal(trackingData.value?.orderId, placedOrderId);
    });
  });
});


import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertOrderNotifyAccess,
  assertOrderPatchAccess,
  assertOrderReadAccess,
  assertOrderUserListAccess,
  assertRazorpayDraftBindAccess,
  evaluateOrderReadAccess,
  extractDraftUserId,
  isOrderAuthEnforced,
  isRazorpayDraftBindEnforced,
  phoneMatchesOrder,
  resolveGuestCredential,
  resolveOrderReadAccess,
} from '../orderAccess';
import { signGuestOrderToken } from '../guestOrderToken';

const TEST_SECRET = 'test-guest-order-secret-32-chars-min!!';

describe('orderAccess', () => {
  const order = {
    userId: 'customer-uid',
    tenantId: 'tenant-mana-inti',
  };

  it('allows platform admin', () => {
    const result = evaluateOrderReadAccess({
      requestedOrderId: 'order-1',
      order,
      firebaseUser: { uid: 'admin-uid', admin: true },
    });
    assert.equal(result.allowed, true);
    assert.equal(result.reason, 'admin');
  });

  it('allows order owner', () => {
    const result = evaluateOrderReadAccess({
      requestedOrderId: 'order-1',
      order,
      firebaseUser: { uid: 'customer-uid' },
    });
    assert.equal(result.allowed, true);
    assert.equal(result.reason, 'order_owner');
  });

  it('allows tenant owner', () => {
    const result = evaluateOrderReadAccess({
      requestedOrderId: 'order-1',
      order,
      firebaseUser: { uid: 'owner-uid' },
      ownedTenantIds: ['tenant-mana-inti'],
    });
    assert.equal(result.allowed, true);
    assert.equal(result.reason, 'tenant_owner');
  });

  it('allows guest token scoped to requested order', () => {
    const result = evaluateOrderReadAccess({
      requestedOrderId: 'order-guest',
      order: { userId: null, tenantId: 'tenant-mana-inti' },
      guestOrderId: 'order-guest',
    });
    assert.equal(result.allowed, true);
    assert.equal(result.reason, 'guest_token');
  });

  it('denies unauthenticated access', () => {
    const result = evaluateOrderReadAccess({
      requestedOrderId: 'order-1',
      order,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'unauthenticated');
  });

  it('denies authenticated user without relationship to order', () => {
    const result = evaluateOrderReadAccess({
      requestedOrderId: 'order-1',
      order,
      firebaseUser: { uid: 'other-user' },
      ownedTenantIds: ['other-tenant'],
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'forbidden');
  });

  it('loads owned tenant ids when resolver is provided', async () => {
    const result = await resolveOrderReadAccess(
      {
        requestedOrderId: 'order-1',
        order,
        firebaseUser: { uid: 'owner-uid' },
      },
      {
        getOwnedTenantIds: async () => ['tenant-mana-inti'],
      }
    );
    assert.equal(result.allowed, true);
    assert.equal(result.reason, 'tenant_owner');
  });

  it('resolves guest credential from Authorization header', () => {
    const orderId = 'order-guest-header';
    const { token } = signGuestOrderToken(orderId, { secret: TEST_SECRET });
    const resolved = resolveGuestCredential(`Guest ${token}`, orderId, { secret: TEST_SECRET });

    assert.equal(resolved.guestOrderId, orderId);
    assert.equal(resolved.error, undefined);
  });

  it('resolves guest credential from raw guestToken query value', () => {
    const orderId = 'order-guest-query';
    const { token } = signGuestOrderToken(orderId, { secret: TEST_SECRET });
    const resolved = resolveGuestCredential(undefined, orderId, {
      secret: TEST_SECRET,
      guestToken: token,
    });

    assert.equal(resolved.guestOrderId, orderId);
  });

  it('returns guest token error for wrong order id', () => {
    const orderId = 'order-guest-header';
    const { token } = signGuestOrderToken(orderId, { secret: TEST_SECRET });
    const resolved = resolveGuestCredential(`Guest ${token}`, 'different-order', { secret: TEST_SECRET });

    assert.equal(resolved.guestOrderId, undefined);
    assert.ok(resolved.error);
    assert.equal(resolved.error?.code, 'ORDER_MISMATCH');
  });
});

describe('assertOrderReadAccess', () => {
  const order = { userId: 'customer-uid', tenantId: 'tenant-1' };

  it('allows order owner via bearer token', async () => {
    const decision = await assertOrderReadAccess({
      requestedOrderId: 'order-1',
      order,
      authHeader: 'Bearer valid-token',
      verifyFirebaseToken: async () => ({ uid: 'customer-uid' }),
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'order_owner');
  });

  it('denies unauthenticated access with 401', async () => {
    const decision = await assertOrderReadAccess({
      requestedOrderId: 'order-1',
      order,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 401);
    assert.equal(decision.reason, 'unauthenticated');
  });

  it('denies invalid bearer token with 401', async () => {
    const decision = await assertOrderReadAccess({
      requestedOrderId: 'order-1',
      order,
      authHeader: 'Bearer bad-token',
      verifyFirebaseToken: async () => {
        throw new Error('invalid');
      },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 401);
  });
});

describe('assertOrderPatchAccess', () => {
  const order = { userId: 'customer-uid', tenantId: 'tenant-1' };

  it('allows tenant owner patch access', async () => {
    const decision = await assertOrderPatchAccess({
      requestedOrderId: 'order-1',
      order,
      authHeader: 'Bearer owner-token',
      verifyFirebaseToken: async () => ({ uid: 'owner-uid' }),
      getOwnedTenantIds: async () => ['tenant-1'],
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'tenant_owner');
  });

  it('denies unauthenticated patch with 403', async () => {
    const decision = await assertOrderPatchAccess({
      requestedOrderId: 'order-1',
      order,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
  });
});

describe('isOrderAuthEnforced', () => {
  it('reads FF_ORDER_AUTH_ENFORCE', () => {
    const previous = process.env.FF_ORDER_AUTH_ENFORCE;
    process.env.FF_ORDER_AUTH_ENFORCE = 'true';
    assert.equal(isOrderAuthEnforced(), true);
    process.env.FF_ORDER_AUTH_ENFORCE = 'false';
    assert.equal(isOrderAuthEnforced(), false);
    if (previous === undefined) {
      delete process.env.FF_ORDER_AUTH_ENFORCE;
    } else {
      process.env.FF_ORDER_AUTH_ENFORCE = previous;
    }
  });
});

describe('extractDraftUserId', () => {
  it('reads userId from orderPayload', () => {
    assert.equal(
      extractDraftUserId({ orderPayload: { userId: 'user-1' } }),
      'user-1'
    );
  });

  it('prefers top-level userId when present', () => {
    assert.equal(
      extractDraftUserId({ userId: 'top-user', orderPayload: { userId: 'nested-user' } }),
      'top-user'
    );
  });

  it('returns null for guest drafts', () => {
    assert.equal(extractDraftUserId({ orderPayload: { userId: null } }), null);
    assert.equal(extractDraftUserId({}), null);
  });
});

describe('assertRazorpayDraftBindAccess', () => {
  it('allows guest drafts without authentication', async () => {
    const decision = await assertRazorpayDraftBindAccess({
      draftUserId: null,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'guest_token');
  });

  it('allows draft owner via bearer token', async () => {
    const decision = await assertRazorpayDraftBindAccess({
      draftUserId: 'customer-uid',
      authHeader: 'Bearer valid-token',
      verifyFirebaseToken: async () => ({ uid: 'customer-uid' }),
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'order_owner');
  });

  it('denies owned draft without authentication', async () => {
    const decision = await assertRazorpayDraftBindAccess({
      draftUserId: 'customer-uid',
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 401);
  });

  it('denies cross-user draft access', async () => {
    const decision = await assertRazorpayDraftBindAccess({
      draftUserId: 'customer-uid',
      authHeader: 'Bearer other-token',
      verifyFirebaseToken: async () => ({ uid: 'other-user' }),
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
  });
});

describe('isRazorpayDraftBindEnforced', () => {
  it('reads FF_RAZORPAY_DRAFT_BIND', () => {
    const previous = process.env.FF_RAZORPAY_DRAFT_BIND;
    process.env.FF_RAZORPAY_DRAFT_BIND = 'true';
    assert.equal(isRazorpayDraftBindEnforced(), true);
    process.env.FF_RAZORPAY_DRAFT_BIND = 'false';
    assert.equal(isRazorpayDraftBindEnforced(), false);
    if (previous === undefined) {
      delete process.env.FF_RAZORPAY_DRAFT_BIND;
    } else {
      process.env.FF_RAZORPAY_DRAFT_BIND = previous;
    }
  });
});

describe('assertOrderUserListAccess', () => {
  it('allows a user to list their own orders', () => {
    const decision = assertOrderUserListAccess({ uid: 'user-1' }, 'user-1');
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'self');
  });

  it('allows admin to list any user orders', () => {
    const decision = assertOrderUserListAccess({ uid: 'admin-1', admin: true }, 'user-2');
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'admin');
  });

  it('denies cross-user order listing', () => {
    const decision = assertOrderUserListAccess({ uid: 'user-1' }, 'user-2');
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
  });
});

describe('assertOrderNotifyAccess', () => {
  const order = { userId: 'customer-uid', tenantId: 'tenant-1' };

  it('allows tenant owner to notify', async () => {
    const decision = await assertOrderNotifyAccess({
      firebaseUser: { uid: 'owner-uid' },
      order,
      getOwnedTenantIds: async () => ['tenant-1'],
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.reason, 'tenant_owner');
  });

  it('denies customer notify access', async () => {
    const decision = await assertOrderNotifyAccess({
      firebaseUser: { uid: 'customer-uid' },
      order,
      getOwnedTenantIds: async () => [],
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
  });
});

describe('phoneMatchesOrder', () => {
  it('matches full normalized phone numbers', () => {
    assert.equal(phoneMatchesOrder('+91 98765-43210', { phone: '9876543210' }), true);
    assert.equal(phoneMatchesOrder('9876543210', { phone: '9123456789' }), false);
  });

  it('matches phone last four digits', () => {
    assert.equal(phoneMatchesOrder('9876543210', { phoneLast4: '3210' }), true);
    assert.equal(phoneMatchesOrder('9876543210', { phoneLast4: '1234' }), false);
    assert.equal(phoneMatchesOrder('9876543210', { phoneLast4: '321' }), false);
  });
});

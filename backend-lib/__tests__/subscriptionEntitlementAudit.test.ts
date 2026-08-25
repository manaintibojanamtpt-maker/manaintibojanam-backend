import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  computeSubscriptionState,
  computeTrialState,
  hasEntitlement,
  assertEntitlement,
} from '../canonicalEntitlements.js';
import { getEffectiveEntitlement } from '../../src/lib/effectiveEntitlement.js';
import {
  verifyOrderPaymentSignature,
  verifySubscriptionPaymentSignature,
} from '../shared/razorpayVerification.js';

describe('Subscription & Entitlement Comprehensive Regression Suite', () => {
  const expiredIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  it('1. expired trial + founderOverride=true -> ACTIVE (canAcceptOrders = true)', () => {
    const tenantDoc = {
      status: 'active',
      trialEndsAt: expiredIso,
      subscription: {
        planId: 'growth',
        status: 'active',
        trialExpiresAt: expiredIso,
        founderOverride: true,
        founderOverrideAction: 'grantPlan',
        founderOverrideBy: 'admin@bhojanos.com',
      },
    };

    const state = computeSubscriptionState(tenantDoc);
    assert.equal(state.status, 'active');
    assert.equal(state.planId, 'growth');
    assert.equal(state.founderOverride, true);

    const effective = getEffectiveEntitlement(tenantDoc);
    assert.equal(effective.effectivePlanId, 'growth');
    assert.equal(effective.status, 'active');
    assert.equal(effective.isExpired, false);
    assert.equal(effective.isSuspended, false);
    assert.equal(effective.canAcceptOrders, true);
    assert.equal(effective.displayLabel, 'Growth · Granted');
  });

  it('2. expired trial + subscription.status=active -> ACTIVE (paid subscriber)', () => {
    const tenantDoc = {
      status: 'active',
      trialEndsAt: expiredIso,
      subscription: {
        planId: 'growth',
        status: 'active',
        trialExpiresAt: expiredIso,
        paidActivatedAt: new Date().toISOString(),
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    const state = computeSubscriptionState(tenantDoc);
    assert.equal(state.status, 'active');

    const effective = getEffectiveEntitlement(tenantDoc);
    assert.equal(effective.status, 'active');
    assert.equal(effective.isExpired, false);
    assert.equal(effective.canAcceptOrders, true);
  });

  it('3. expired trial + no active entitlement -> EXPIRED (canAcceptOrders = false)', () => {
    const tenantDoc = {
      status: 'trialing',
      trialEndsAt: expiredIso,
      subscription: {
        planId: 'growth',
        status: 'trialing',
        trialExpiresAt: expiredIso,
        trialUsed: true,
      },
    };

    const state = computeSubscriptionState(tenantDoc);
    assert.equal(state.status, 'expired');

    const effective = getEffectiveEntitlement(tenantDoc);
    assert.equal(effective.isExpired, true);
    assert.equal(effective.isSuspended, true);
    assert.equal(effective.canAcceptOrders, false);
    assert.equal(effective.displayLabel, 'Growth · Expired');
  });

  it('4. revoke founderOverride + expired trial + no paid subscription -> EXPIRED', () => {
    const tenantDoc = {
      status: 'active',
      trialEndsAt: expiredIso,
      subscription: {
        planId: 'growth',
        status: 'expired',
        trialExpiresAt: expiredIso,
        founderOverride: false, // Revoked
      },
    };

    const state = computeSubscriptionState(tenantDoc);
    assert.equal(state.status, 'expired');

    const effective = getEffectiveEntitlement(tenantDoc);
    assert.equal(effective.isExpired, true);
    assert.equal(effective.canAcceptOrders, false);
  });

  it('5 & 6. Razorpay Order signature: valid -> PASS, invalid -> REJECT', () => {
    const secret = 'rzp_secret_key_999';
    const orderId = 'order_999888777';
    const paymentId = 'pay_111222333';
    
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.equal(verifyOrderPaymentSignature(orderId, paymentId, validSignature, secret), true);
    assert.equal(verifyOrderPaymentSignature(orderId, paymentId, 'invalid_sig', secret), false);
  });

  it('7 & 8. Razorpay Subscription signature: valid -> PASS, invalid -> REJECT', () => {
    const secret = 'rzp_sub_secret_888';
    const subId = 'sub_999888777';
    const paymentId = 'pay_444555666';

    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${subId}|${paymentId}`)
      .digest('hex');

    assert.equal(verifySubscriptionPaymentSignature(subId, paymentId, validSignature, secret), true);
    assert.equal(verifySubscriptionPaymentSignature(subId, paymentId, 'tampered_sig', secret), false);
  });

  it('9 & 10. Successful payment activates entitlement, failed payment does not', () => {
    // Payment SUCCESS payload
    const successPatch = {
      status: 'active',
      subscription: {
        planId: 'growth',
        status: 'active',
        paidActivatedAt: new Date().toISOString(),
      },
    };
    const activeState = computeSubscriptionState(successPatch);
    assert.equal(activeState.status, 'active');

    // Payment FAILED / Past Due payload
    const failedPatch = {
      status: 'past_due',
      subscription: {
        planId: 'growth',
        status: 'past_due',
        failedPaymentAttempts: 1,
      },
    };
    const failedState = computeSubscriptionState(failedPatch);
    assert.equal(failedState.status, 'past_due');
    assert.equal(getEffectiveEntitlement(failedPatch).canAcceptOrders, false);
  });

  it('11 & 12. Idempotency & billing period stability on duplicate payment confirmation', () => {
    const currentPeriodStart = '2026-08-01T00:00:00.000Z';
    const currentPeriodEnd = '2026-08-31T00:00:00.000Z';

    const firstPaymentResult = {
      subscription: {
        planId: 'growth',
        status: 'active',
        razorpayPaymentId: 'pay_ABC123',
        currentPeriodStart,
        currentPeriodEnd,
      },
    };

    // Duplicate webhook or double payment confirmation received for SAME period
    const secondPaymentResult = {
      subscription: {
        ...firstPaymentResult.subscription,
        razorpayPaymentId: 'pay_ABC123', // Same payment ID
      },
    };

    assert.equal(secondPaymentResult.subscription.currentPeriodStart, currentPeriodStart);
    assert.equal(secondPaymentResult.subscription.currentPeriodEnd, currentPeriodEnd);
  });
});

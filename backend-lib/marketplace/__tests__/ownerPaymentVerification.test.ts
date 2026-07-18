import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildOwnerUpiPendingMessage,
  isAwaitingUpiPayment,
  isDirectUpiOrder,
} from '../ownerPaymentVerification.ts';

describe('ownerPaymentVerification helpers', () => {
  it('detects direct UPI orders', () => {
    assert.equal(isDirectUpiOrder({ paymentMethod: 'upi' }), true);
    assert.equal(isDirectUpiOrder({ paymentMethod: 'razorpay' }), false);
    assert.equal(isDirectUpiOrder({ paymentMethod: 'cod', isCOD: true }), false);
  });

  it('detects awaiting UPI payment orders', () => {
    assert.equal(
      isAwaitingUpiPayment({
        paymentMethod: 'upi',
        paymentStatus: 'pending',
        status: 'PENDING_PAYMENT',
      }),
      true,
    );
    assert.equal(
      isAwaitingUpiPayment({
        paymentMethod: 'upi',
        paymentStatus: 'success',
        status: 'PENDING_PAYMENT',
      }),
      false,
    );
    assert.equal(
      isAwaitingUpiPayment({
        paymentMethod: 'razorpay',
        paymentStatus: 'pending',
        status: 'PENDING_PAYMENT',
      }),
      false,
    );
  });

  it('builds owner pending UPI notification copy', () => {
    const message = buildOwnerUpiPendingMessage({
      orderNumber: 100044,
      customerName: 'Viswa',
      totalAmount: 239,
    });
    assert.match(message, /100044/);
    assert.match(message, /Verify & Accept/);
    assert.match(message, /239/);
  });
});

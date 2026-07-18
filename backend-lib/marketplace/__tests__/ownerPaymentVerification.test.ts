import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildOwnerUpiPendingMessage,
  claimCustomerUpiPayment,
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

  it('claimCustomerUpiPayment moves order into owner verification queue', async () => {
    let stored: Record<string, unknown> = {
      phone: '9876543210',
      paymentMethod: 'upi',
      paymentStatus: 'pending',
      status: 'PENDING_PAYMENT',
    };

    const fieldValue = {
      serverTimestamp: () => ({ __type: 'serverTimestamp' }),
      arrayUnion: (...values: unknown[]) => ({ __op: 'arrayUnion', values }),
    };

    const db = {
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => stored,
          }),
          update: async (patch: Record<string, unknown>) => {
            stored = { ...stored, ...patch };
          },
        }),
      }),
    } as never;

    const result = await claimCustomerUpiPayment(db, fieldValue as never, {
      orderId: 'ord-100050',
      phone: '+91 9876543210',
      upiReference: 'TXN123456789',
    });

    assert.equal(result.recorded, true);
    assert.equal(stored.status, 'PAYMENT_VERIFICATION');
    assert.equal(stored.paymentStatus, 'pending_verification');
    assert.equal(stored.customerPaymentClaimed, true);
    assert.equal(stored.customerUpiReference, 'TXN123456789');
    assert.equal(
      isAwaitingUpiPayment({
        paymentMethod: 'upi',
        paymentStatus: stored.paymentStatus,
        status: stored.status,
      }),
      true,
    );
  });
});

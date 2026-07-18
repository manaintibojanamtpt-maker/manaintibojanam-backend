import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAwaitingOwnerUpiVerification, isOwnerActionablePlacedOrder } from '../ownerUpiPayment.ts';

describe('ownerUpiPayment', () => {
  it('flags marketplace UPI orders awaiting owner verification', () => {
    assert.equal(
      isAwaitingOwnerUpiVerification({
        status: 'PENDING_PAYMENT',
        paymentStatus: 'pending',
        paymentMethod: 'upi',
      }),
      true,
    );
  });

  it('does not flag verified or non-UPI orders', () => {
    assert.equal(
      isAwaitingOwnerUpiVerification({
        status: 'PENDING_PAYMENT',
        paymentStatus: 'success',
        paymentMethod: 'upi',
      }),
      false,
    );
    assert.equal(
      isAwaitingOwnerUpiVerification({
        status: 'PLACED',
        paymentStatus: 'pending',
        paymentMethod: 'cod',
        isCOD: true,
      }),
      false,
    );
  });

  it('treats pending payment statuses as actionable placed orders', () => {
    assert.equal(isOwnerActionablePlacedOrder('PENDING_PAYMENT'), true);
    assert.equal(isOwnerActionablePlacedOrder('ACCEPTED'), false);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildUpiPayUrl, isValidUpiId, normalizeUpiId } from '../upiValidation';

describe('upiValidation', () => {
  it('validates VPA format', () => {
    assert.equal(isValidUpiId('kitchen@paytm'), true);
    assert.equal(isValidUpiId('name@ybl'), true);
    assert.equal(isValidUpiId('invalid'), false);
    assert.equal(isValidUpiId(''), false);
  });

  it('normalizes UPI ids to lowercase trimmed', () => {
    assert.equal(normalizeUpiId(' Kitchen@PayTM '), 'kitchen@paytm');
  });

  it('builds upi deep link with amount and order reference', () => {
    const url = buildUpiPayUrl({
      upiId: 'kitchen@paytm',
      merchantName: 'Mana Inti',
      amount: 499,
      orderId: 'order-123',
    });
    assert.match(url, /^upi:\/\/pay\?/);
    assert.match(url, /pa=kitchen%40paytm/);
    assert.match(url, /am=499/);
    assert.match(url, /tr=order-123/);
  });
});

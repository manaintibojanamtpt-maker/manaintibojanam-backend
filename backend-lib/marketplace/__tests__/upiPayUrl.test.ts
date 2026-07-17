import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildUpiPayUrl, formatUpiAmount, isValidUpiId } from '../upiPayUrl.js';

describe('upiPayUrl', () => {
  it('formats amount with two decimals', () => {
    assert.equal(formatUpiAmount(299), '299.00');
    assert.equal(formatUpiAmount(10.5), '10.50');
  });

  it('builds standard upi:// intent URLs', () => {
    const url = buildUpiPayUrl({
      upiId: 'kitchen@paytm',
      merchantName: 'Test Kitchen',
      amount: 299,
      orderId: 'ord_123',
      transactionNote: 'OrderBhojan #100031',
    });

    assert.match(url, /^upi:\/\/pay\?/);
    assert.match(url, /pa=kitchen%40paytm/);
    assert.match(url, /am=299\.00/);
    assert.match(url, /tr=ord_123/);
    assert.match(url, /tn=OrderBhojan/);
    assert.match(url, /cu=INR/);
  });

  it('validates UPI VPAs', () => {
    assert.equal(isValidUpiId('kitchen@paytm'), true);
    assert.equal(isValidUpiId('9876543210'), false);
  });
});

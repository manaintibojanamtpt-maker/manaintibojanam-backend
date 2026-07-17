import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('checkout direct UPI payment', () => {
  it('shows UPI when prepare returns upi without razorpay', () => {
    const checkout = readFileSync(
      join(root, 'src/presentation/checkout/OrderBhojanCheckoutPage.tsx'),
      'utf8',
    );

    assert.match(checkout, /paymentMethods\.includes\('upi'\)/);
    assert.match(checkout, /showUpiButton = supportsUpi && !supportsRazorpay/);
    assert.match(checkout, /showRazorpay=\{showRazorpayButton \|\| showUpiButton\}/);
    assert.match(checkout, /razorpayLabel=\{showUpiButton \? 'Pay via UPI' : 'Pay online'\}/);
    assert.match(checkout, /handlePlaceUpi/);
    assert.match(checkout, /placeUpiOrder/);
  });

  it('placeUpiOrder opens the returned upiUrl', () => {
    const flow = readFileSync(join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'), 'utf8');

    assert.match(flow, /paymentMethod: 'upi'/);
    assert.match(flow, /response\.upiUrl/);
    assert.match(flow, /window\.location\.href = response\.upiUrl/);
  });
});

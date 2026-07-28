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
    assert.match(checkout, /showUpiButton\s*\?\s*'Pay via UPI'\s*:\s*'Pay online'/);
    assert.match(checkout, /handlePlaceUpi/);
    assert.match(checkout, /placeUpiOrder/);
    assert.match(checkout, /UpiPaymentPendingView/);
  });

  it('placeUpiOrder keeps payment pending until verification', () => {
    const flow = readFileSync(join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'), 'utf8');

    assert.match(flow, /paymentMethod: 'upi'/);
    assert.match(flow, /awaiting_payment/);
    assert.match(flow, /pollUpiPaymentStatus/);
    assert.doesNotMatch(flow, /window\.location\.href = response\.upiUrl/);
    assert.doesNotMatch(flow, /launchUpiIntent/);
  });

  it('uses app-specific UPI deep link helpers', () => {
    const upi = readFileSync(
      join(root, 'src/features/checkout/infrastructure/upiCheckout.ts'),
      'utf8',
    );

    assert.match(upi, /buildUpiAppDeepLink/);
    assert.match(upi, /launchUpiDeepLink/);
    assert.match(upi, /tez:\/\/upi\/pay/);
    assert.match(upi, /phonepe:\/\/pay/);
    assert.match(upi, /paytmmp:\/\/pay/);
    assert.match(upi, /buildUpiQrImageUrl/);
    assert.doesNotMatch(upi, /window\.location\.href\s*=/);
  });

  it('pending UPI screen shows app picker on mobile', () => {
    const pending = readFileSync(
      join(root, 'src/presentation/checkout/UpiPaymentPendingView.tsx'),
      'utf8',
    );

    assert.match(pending, /Choose your UPI app/);
    assert.match(pending, /UPI_APP_CHOICES/);
    assert.match(pending, /launchUpiAppWithFallback/);
    assert.match(pending, /watchUpiHandoffReturn/);
    assert.match(pending, /Copy payment details/);
    assert.match(pending, /I've paid — notify kitchen/);
    assert.match(pending, /kitchen confirms UPI/i);
    assert.doesNotMatch(pending, /launchUpiIntent\(upiUrl\)/);
  });

  it('defers cart clear until UPI verified or claimed', () => {
    const flow = readFileSync(join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'), 'utf8');
    assert.match(flow, /Keep cart until UPI is verified/);
    assert.match(flow, /placeAmountPaise/);
    assert.match(flow, /finalizeUpiPaymentSuccess/);
  });
});


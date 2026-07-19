import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  buildOrderTrustCopyText,
  formatCheckoutDeliveryAddress,
  formatCheckoutEstimatedDelivery,
} from '../src/features/checkout/domain/checkoutDeliveryDisplay.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('checkout success confirmation', () => {
  it('formats delivery address from v2 location text', () => {
    const label = formatCheckoutDeliveryAddress(
      { displayLabel: 'Fallback label' } as never,
      {
        text: {
          flat: 'Flat 12',
          building: 'Sunrise Apartments',
          area: 'Koregaon Park',
          city: 'Pune',
          shortLabel: 'Koregaon Park, Pune',
        },
      } as never,
    );

    assert.match(label, /Flat 12/);
    assert.match(label, /Koregaon Park/);
  });

  it('formats ASAP delivery estimate from prep minutes', () => {
    const label = formatCheckoutEstimatedDelivery('ASAP', {
      isStoreOpen: true,
      storeTiming: { openTime: '10:00', closeTime: '22:00', businessHoursEnabled: true },
      prepMinutes: 35,
      deliverySlots: ['Standard Delivery (ASAP)'],
    });

    assert.equal(label, 'Estimated delivery in ~35 min');
  });

  it('builds copy text with order number, id, and address', () => {
    const text = buildOrderTrustCopyText({
      orderNumber: '463577',
      orderId: 'ob_ord_mock_001',
      deliveryAddress: 'Flat 12, Koregaon Park, Pune',
      estimatedDelivery: 'Estimated delivery in ~35 min',
    });

    assert.match(text, /Order #463577/);
    assert.match(text, /Order ID: ob_ord_mock_001/);
    assert.match(text, /Deliver to: Flat 12, Koregaon Park, Pune/);
    assert.match(text, /Estimated: Estimated delivery in ~35 min/);
  });

  it('checkout page uses shared success confirmation view', () => {
    const checkout = readFileSync(
      join(root, 'src/presentation/checkout/OrderBhojanCheckoutPage.tsx'),
      'utf8',
    );

    assert.match(checkout, /OrderBhojanCheckoutSuccessView/);
    assert.match(checkout, /formatCheckoutDeliveryAddress/);
    assert.match(checkout, /formatCheckoutEstimatedDelivery/);
    assert.match(checkout, /deliveryAddress=\{deliveryAddressLabel\}/);
  });

  it('UPI pending screen shows order trust panel with address', () => {
    const pending = readFileSync(
      join(root, 'src/presentation/checkout/UpiPaymentPendingView.tsx'),
      'utf8',
    );

    assert.match(pending, /OrderBhojanOrderTrustPanel/);
    assert.match(pending, /deliveryAddress/);
    assert.match(pending, /estimatedDelivery/);
  });

  it('success view exposes track and browse CTAs', () => {
    const success = readFileSync(
      join(root, 'src/presentation/checkout/OrderBhojanCheckoutSuccessView.tsx'),
      'utf8',
    );
    const trustPanel = readFileSync(
      join(root, 'src/presentation/checkout/OrderBhojanOrderTrustPanel.tsx'),
      'utf8',
    );

    assert.match(success, /Track order/);
    assert.match(success, /Continue browsing/);
    assert.match(trustPanel, /Order placed successfully/);
    assert.match(trustPanel, /Copy order details/);
  });
});

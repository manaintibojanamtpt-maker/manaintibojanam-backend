import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeInvoiceGrandTotal,
  resolveInvoiceGstAmount,
  resolveInvoicePaymentPresentation,
} from '../../src/design-system/orders/tracking/invoicePresentation.ts';
import { mapTrackingInvoice } from '../src/presentation/tracking/mapTrackingViews.ts';

describe('invoice presentation', () => {
  it('treats delivered COD invoice as total paid', () => {
    const payment = resolveInvoicePaymentPresentation({
      paymentStatus: 'pending',
      paymentMethod: 'cod',
      codCollected: true,
    });
    assert.equal(payment.totalLabel, 'Total paid');
    assert.equal(payment.badgeLabel, 'Paid');
    assert.equal(payment.badgeTone, 'paid');
  });

  it('keeps pending COD as amount due before collection', () => {
    const payment = resolveInvoicePaymentPresentation({
      paymentStatus: 'pending',
      paymentMethod: 'cod',
      orderStatus: 'PLACED',
    });
    assert.equal(payment.totalLabel, 'Amount due');
    assert.equal(payment.badgeLabel, 'Cash on delivery');
    assert.equal(payment.badgeTone, 'pending');
  });

  it('marks verified online payment as total paid', () => {
    const payment = resolveInvoicePaymentPresentation({
      paymentStatus: 'verified',
      paymentMethod: 'razorpay',
    });
    assert.equal(payment.totalLabel, 'Total paid');
    assert.equal(payment.badgeTone, 'paid');
  });

  it('computes grand total from pricing breakdown', () => {
    const total = computeInvoiceGrandTotal({
      subtotal: 566,
      gstAmount: 0,
      packingFee: 15,
      deliveryFee: 10,
      grandTotal: 591,
    });
    assert.equal(total, 591);
  });

  it('reconciles stored grand total when breakdown components disagree', () => {
    const total = computeInvoiceGrandTotal({
      subtotal: 566,
      gstAmount: 28,
      packingFee: 15,
      deliveryFee: 10,
      grandTotal: 591,
    });
    assert.equal(total, 619);
  });

  it('resolves gst amount from percent when gstAmount is missing', () => {
    assert.equal(resolveInvoiceGstAmount({ subtotal: 200, gst: 5 }), 10);
    assert.equal(resolveInvoiceGstAmount({ subtotal: 200, gstAmount: 12 }), 12);
  });
});

describe('mapTrackingInvoice', () => {
  it('maps order #100018 style COD delivered invoice to total paid', () => {
    const view = mapTrackingInvoice({
      orderNumber: '100018',
      createdAt: '2026-07-16T10:00:00.000Z',
      kitchenName: 'Test Kitchen',
      customerName: 'Guest',
      phone: '9876543210',
      address: '402, Gopalpatti, Pune',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      items: [
        { itemId: 'a', name: 'Item A', quantity: 1, unitPrice: 149 },
        { itemId: 'b', name: 'Item B', quantity: 1, unitPrice: 189 },
        { itemId: 'c', name: 'Item C', quantity: 1, unitPrice: 99 },
        { itemId: 'd', name: 'Item D', quantity: 1, unitPrice: 129 },
      ],
      subtotal: 566,
      gstAmount: 0,
      gstPercent: 0,
      packingFee: 15,
      deliveryFee: 10,
      grandTotal: 591,
    });

    const emphasis = view.totals.find((line) => line.emphasis);
    assert.equal(emphasis?.label, 'Total paid');
    assert.equal(emphasis?.amountLabel, '₹591');
    assert.equal(view.paymentBadgeLabel, 'Paid');
    assert.equal(view.paymentBadgeTone, 'paid');
  });
});

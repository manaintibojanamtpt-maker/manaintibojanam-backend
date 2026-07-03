import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mapOrderToReadModel,
  mapOrdersToReadModels,
  normalizeOrderStatus,
  toIsoDateTime,
} from '../orders/mappers/mapOrderToReadModel';

describe('mapOrderToReadModel', () => {
  const sampleOrder = {
    id: 'order-abc',
    tenantId: 'tenant-1',
    userId: 'user-1',
    orderNumber: 1001,
    customerName: 'Test Customer',
    phone: '9876543210',
    status: 'PLACED',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    items: [
      {
        menuItemId: 'menu-1',
        name: 'Meals Box',
        unitPrice: 120,
        quantity: 2,
        lineSubtotal: 240,
        lineTax: 12,
        lineTotal: 252,
      },
    ],
    subtotal: 240,
    totalAmount: 252,
    createdAt: 1_700_000_000_000,
    updatedAt: { _seconds: 1_700_000_100, _nanoseconds: 0 },
  };

  it('maps api order fields to OrderReadModel', () => {
    const model = mapOrderToReadModel(sampleOrder);

    assert.equal(model.id, 'order-abc');
    assert.equal(model.tenantId, 'tenant-1');
    assert.equal(model.userId, 'user-1');
    assert.equal(model.status, 'PLACED');
    assert.equal(model.paymentMethod, 'cod');
    assert.equal(model.paymentStatus, 'pending');
    assert.equal(model.items.length, 1);
    assert.equal(model.items[0].lineTotal, 252);
    assert.equal(model.createdAt, new Date(1_700_000_000_000).toISOString());
    assert.equal(model.updatedAt, new Date(1_700_000_100_000).toISOString());
  });

  it('normalizes legacy placed status to PENDING', () => {
    assert.equal(normalizeOrderStatus('placed'), 'PENDING');
    assert.equal(normalizeOrderStatus('PAYMENT_PENDING'), 'PAYMENT_PENDING');
  });

  it('maps guest orders with null userId', () => {
    const model = mapOrderToReadModel({ ...sampleOrder, userId: null });
    assert.equal(model.userId, null);
  });

  it('maps order arrays', () => {
    const models = mapOrdersToReadModels([sampleOrder, { ...sampleOrder, id: 'order-2' }]);
    assert.equal(models.length, 2);
    assert.equal(models[1].id, 'order-2');
  });

  it('converts firestore-like timestamps', () => {
    const iso = toIsoDateTime({ seconds: 1_700_000_000, nanoseconds: 0 });
    assert.equal(iso, new Date(1_700_000_000_000).toISOString());
  });

  it('preserves tracking display passthrough fields for PR-4 parity', () => {
    const model = mapOrderToReadModel({
      ...sampleOrder,
      prepTime: 25,
      deliveryTime: 30,
      reviewed: true,
      gst: 5,
      gstAmount: 12,
      packingFee: 10,
      deliveryFee: 20,
      address: '123 Main St',
      orderType: 'delivery',
      trackingUrl: 'https://track.example/o/1',
    });

    assert.equal(model.prepTime, 25);
    assert.equal(model.deliveryTime, 30);
    assert.equal(model.reviewed, true);
    assert.equal(model.gst, 5);
    assert.equal(model.gstAmount, 12);
    assert.equal(model.packingFee, 10);
    assert.equal(model.deliveryFee, 20);
    assert.equal(model.address, '123 Main St');
    assert.equal(model.orderType, 'delivery');
    assert.equal(model.trackingUrl, 'https://track.example/o/1');
  });
});

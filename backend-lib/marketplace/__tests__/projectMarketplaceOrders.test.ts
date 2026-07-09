import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getMarketplaceTrackingForGuest,
  projectOrderTracking,
} from '../projectMarketplaceOrders.js';

describe('projectMarketplaceOrders guest tracking', () => {
  it('projectOrderTracking builds timeline from status', () => {
    const tracking = projectOrderTracking('ord-1', {
      status: 'OUT_FOR_DELIVERY',
      createdAt: '2026-01-01T10:00:00.000Z',
      deliveryPartner: 'Rapido',
      trackingUrl: 'https://rapido.bike/track/1',
      riderName: 'Raju',
      riderPhone: '9876543210',
      orderNumber: 463577,
      items: [{ menuItemId: 'item-1', name: 'Biryani', quantity: 1, unitPrice: 249 }],
      totalAmount: 263,
    }, { displayName: 'Mana Inti Kitchen', slug: 'mana-inti' });
    assert.equal(tracking.orderId, 'ord-1');
    assert.equal(tracking.status, 'OUT_FOR_DELIVERY');
    assert.ok(tracking.timeline.length >= 1);
    assert.equal(tracking.delivery?.partner, 'Rapido');
    assert.equal(tracking.delivery?.riderName, 'Raju');
    assert.equal(tracking.invoice, undefined);
    assert.equal(tracking.orderNumber, '463577');
    assert.equal(tracking.reorder?.items.length, 1);
  });

  it('projectOrderTracking includes invoice only after delivery', () => {
    const delivered = projectOrderTracking('ord-2', {
      status: 'DELIVERED',
      createdAt: '2026-01-01T10:00:00.000Z',
      orderNumber: 463578,
      items: [{ menuItemId: 'item-1', name: 'Biryani', quantity: 1, unitPrice: 249 }],
      totalAmount: 263,
    }, { displayName: 'Mana Inti Kitchen', slug: 'mana-inti' });
    assert.equal(delivered.status, 'DELIVERED');
    assert.equal(delivered.invoice?.kitchenName, 'Mana Inti Kitchen');
    assert.equal(delivered.invoice?.orderNumber, '463578');
  });

  it('getMarketplaceTrackingForGuest matches phone last four digits', async () => {
    const db = {
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            id: 'ord-guest',
            data: () => ({
              status: 'PLACED',
              phone: '9876543210',
              createdAt: '2026-01-01T10:00:00.000Z',
            }),
          }),
        }),
      }),
    } as never;

    const ok = await getMarketplaceTrackingForGuest(db, 'ord-guest', '9999993210');
    assert.ok(ok);
    assert.equal(ok?.orderId, 'ord-guest');

    const bad = await getMarketplaceTrackingForGuest(db, 'ord-guest', '1111111111');
    assert.equal(bad, null);
  });
});

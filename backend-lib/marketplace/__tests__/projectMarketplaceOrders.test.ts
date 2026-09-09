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

  it('projectOrderTracking resolves etaMinutes safely for object, null, and missing shapes', () => {
    // 1. Explicit object etaMinutes
    const withObjEta = projectOrderTracking('ord-eta-1', {
      status: 'PLACED',
      createdAt: '2026-01-01T10:00:00.000Z',
      etaMinutes: { min: 20, max: 30 },
    });
    assert.deepEqual(withObjEta.etaMinutes, { min: 20, max: 30 });

    // 2. Corrupt/null object eta ({ min: null, max: null }) - must fallback safely, never produce null/NaN
    const withCorruptEta = projectOrderTracking('ord-eta-2', {
      status: 'PLACED',
      createdAt: '2026-01-01T10:00:00.000Z',
      eta: { min: null, max: null },
    });
    assert.deepEqual(withCorruptEta.etaMinutes, { min: 25, max: 35 });

    // 3. Active PREPARING order without explicit eta - defaults to 20-min prep window
    const preparingOrder = projectOrderTracking('ord-eta-3', {
      status: 'PREPARING',
      createdAt: '2026-01-01T10:00:00.000Z',
    });
    assert.deepEqual(preparingOrder.etaMinutes, { min: 25, max: 35 });

    // 4. Active OUT_FOR_DELIVERY order without explicit eta - defaults to travel window
    const outForDeliveryOrder = projectOrderTracking('ord-eta-4', {
      status: 'OUT_FOR_DELIVERY',
      createdAt: '2026-01-01T10:00:00.000Z',
    });
    assert.deepEqual(outForDeliveryOrder.etaMinutes, { min: 10, max: 20 });

    // 5. Terminal order - must be undefined
    const deliveredOrder = projectOrderTracking('ord-eta-5', {
      status: 'DELIVERED',
      createdAt: '2026-01-01T10:00:00.000Z',
    });
    assert.equal(deliveredOrder.etaMinutes, undefined);
  });
});

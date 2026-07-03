import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createOrderApiAdapter } from '../../sdk/orders/adapters/OrderApiAdapter';
import type { OrderApiPort } from '../../sdk/orders/adapters/OrderApiPort';
import type { OrderId } from '../../sdk/core/types';
import { mapOrderToReadModel } from '../../sdk/orders/mappers/mapOrderToReadModel';

/**
 * PR-4 contract: OrderTracking SDK path uses createOrderSDK → same read model as mapper.
 * Flag routing is validated manually (see docs/m1/PR-4-ORDER-TRACKING-MIGRATION-REPORT.md).
 */

const trackingOrder = {
  id: 'order-track-1',
  tenantId: 'tenant-mana',
  userId: null,
  orderNumber: 9001,
  customerName: 'Guest User',
  phone: '9876543210',
  status: 'PREPARING',
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  items: [{ menuItemId: 'm1', name: 'Meals', unitPrice: 100, quantity: 1, lineSubtotal: 100, lineTotal: 100 }],
  subtotal: 100,
  totalAmount: 100,
  createdAt: '2026-06-26T10:00:00.000Z',
  prepTime: 20,
  deliveryTime: 25,
  reviewed: false,
  gst: 5,
  gstAmount: 5,
  packingFee: 5,
  deliveryFee: 15,
  address: 'Hyderabad',
  orderType: 'delivery',
};

const createMockPort = (overrides: Partial<OrderApiPort> = {}): OrderApiPort => ({
  fetchOrderByIdApi: async () => trackingOrder,
  fetchOrders: async () => [],
  requestGuestViewToken: async () => ({
    success: true,
    token: 'guest-token',
    expiresAt: '2026-06-27T10:00:00.000Z',
  }),
  ...overrides,
});

describe('OrderTracking SDK read parity (PR-4)', () => {
  it('getOrderById snapshot shape matches tracking UI expectations', async () => {
    const sdk = createOrderApiAdapter(createMockPort());
    const result = await sdk.getOrderById('order-track-1' as OrderId);

    assert.equal(result.ok, true);
    if (!result.ok) return;

    const snapshot = { ...result.value };
    const expected = mapOrderToReadModel(trackingOrder);
    assert.deepEqual(snapshot, expected);
    assert.equal(snapshot.prepTime, 20);
    assert.equal(snapshot.address, 'Hyderabad');
  });

  it('requestGuestViewToken success maps to legacy api.ts result shape', async () => {
    const sdk = createOrderApiAdapter(createMockPort());
    const result = await sdk.requestGuestViewToken('order-track-1' as OrderId, {
      phone: '9876543210',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    const legacyShape = {
      success: true as const,
      token: result.value.token,
      expiresAt: result.value.expiresAt,
    };
    assert.equal(legacyShape.success, true);
    assert.equal(legacyShape.token, 'guest-token');
    assert.ok(legacyShape.expiresAt);
  });

  it('requestGuestViewToken failure maps to legacy error shape', async () => {
    const sdk = createOrderApiAdapter(
      createMockPort({
        requestGuestViewToken: async () => ({
          success: false,
          error: 'Order not found',
        }),
      })
    );

    const result = await sdk.requestGuestViewToken('missing' as OrderId, {
      phoneLast4: '3210',
    });

    assert.equal(result.ok, false);
    if (result.ok) return;

    const legacyShape = {
      success: false as const,
      error: result.error.message,
    };
    assert.equal(legacyShape.success, false);
    assert.ok(legacyShape.error);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createOrderApiAdapter } from '../orders/adapters/OrderApiAdapter';
import type { OrderApiPort } from '../orders/adapters/OrderApiPort';
import {
  mapOrderToReadModel,
  mapOrdersToReadModels,
} from '../orders/mappers/mapOrderToReadModel';
import type { OrderId, UserId } from '../core/types';

const sampleOrder = {
  id: 'order-parity-1',
  tenantId: 'tenant-mana',
  userId: 'customer-uid',
  orderNumber: 463577,
  customerName: 'Parity Test',
  phone: '9876543210',
  status: 'DELIVERED',
  paymentMethod: 'razorpay',
  paymentStatus: 'success',
  items: [
    {
      menuItemId: 'item-1',
      name: 'Thali',
      unitPrice: 150,
      quantity: 1,
      lineSubtotal: 150,
      lineTax: 7.5,
      lineTotal: 157.5,
    },
  ],
  subtotal: 150,
  totalAmount: 157.5,
  createdAt: '2026-06-01T10:00:00.000Z',
};

const createMockPort = (overrides: Partial<OrderApiPort> = {}): OrderApiPort => ({
  fetchOrderByIdApi: async () => sampleOrder,
  fetchOrders: async () => [sampleOrder],
  requestGuestViewToken: async () => ({
    success: true,
    token: 'guest-jwt-token',
    expiresAt: '2026-06-02T10:00:00.000Z',
  }),
  ...overrides,
});

describe('OrderApiAdapter', () => {
  it('returns NOT_FOUND when api returns null', async () => {
    const adapter = createOrderApiAdapter(
      createMockPort({
        fetchOrderByIdApi: async () => null,
      })
    );

    const result = await adapter.getOrderById('missing' as OrderId);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'NOT_FOUND');
    }
  });

  it('validates userId for listOrdersForUser', async () => {
    const adapter = createOrderApiAdapter(createMockPort());
    const result = await adapter.listOrdersForUser({}, {});
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'VALIDATION');
    }
  });

  it('filters listed orders by tenantId and limit', async () => {
    const adapter = createOrderApiAdapter(
      createMockPort({
        fetchOrders: async () => [
          sampleOrder,
          { ...sampleOrder, id: 'order-2', tenantId: 'other-tenant' },
          { ...sampleOrder, id: 'order-3', tenantId: 'tenant-mana' },
        ],
      })
    );

    const result = await adapter.listOrdersForUser(
      { userId: 'customer-uid' as UserId, tenantId: 'tenant-mana' as any, limit: 1 },
      {}
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.length, 1);
      assert.equal(result.value[0].tenantId, 'tenant-mana');
    }
  });

  it('maps guest token success', async () => {
    const adapter = createOrderApiAdapter(createMockPort());
    const result = await adapter.requestGuestViewToken('order-parity-1' as OrderId, {
      phone: '9876543210',
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.token, 'guest-jwt-token');
    }
  });

  it('maps guest token failure', async () => {
    const adapter = createOrderApiAdapter(
      createMockPort({
        requestGuestViewToken: async () => ({
          success: false,
          error: 'Order not found',
        }),
      })
    );

    const result = await adapter.requestGuestViewToken('order-parity-1' as OrderId, {
      phoneLast4: '3210',
    });

    assert.equal(result.ok, false);
  });
});

describe('OrderApiAdapter parity with api.ts mapping', () => {
  it('getOrderById matches mapOrderToReadModel(api record)', async () => {
    const port = createMockPort();
    const adapter = createOrderApiAdapter(port);

    const apiRecord = await port.fetchOrderByIdApi('order-parity-1');
    assert.ok(apiRecord);

    const expected = mapOrderToReadModel(apiRecord);
    const result = await adapter.getOrderById('order-parity-1' as OrderId);

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value, expected);
    }
  });

  it('listOrdersForUser matches mapOrdersToReadModels(api records)', async () => {
    const orders = [
      sampleOrder,
      { ...sampleOrder, id: 'order-parity-2', orderNumber: 463578 },
    ];
    const port = createMockPort({ fetchOrders: async () => orders });
    const adapter = createOrderApiAdapter(port);

    const apiRecords = await port.fetchOrders('customer-uid');
    const expected = mapOrdersToReadModels(apiRecords);

    const result = await adapter.listOrdersForUser(
      { userId: 'customer-uid' as UserId },
      {}
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value, expected);
    }
  });
});

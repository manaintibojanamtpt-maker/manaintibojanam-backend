import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createOrderApiAdapter } from '../../sdk/orders/adapters/OrderApiAdapter';
import type { OrderApiPort } from '../../sdk/orders/adapters/OrderApiPort';
import type { OrderId, UserId } from '../../sdk/core/types';
import { mapOrdersToReadModels } from '../../sdk/orders/mappers/mapOrderToReadModel';
import { readModelToOrder } from '../orderReadModelMapper';
import { FeedbackStatus, OrderStatus } from '../../types';

const listOrderRecord = {
  id: 'order-my-1',
  tenantId: 'tenant-mana',
  userId: 'customer-uid',
  orderNumber: 5001,
  customerName: 'My Orders User',
  phone: '9876543210',
  status: 'DELIVERED',
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  items: [
    {
      menuItemId: 'menu-1',
      name: 'Thali',
      unitPrice: 150,
      quantity: 2,
      lineSubtotal: 300,
      lineTotal: 300,
    },
  ],
  subtotal: 300,
  totalAmount: 300,
  createdAt: '2026-06-26T09:00:00.000Z',
  deliveryType: 'asap',
  deliveryTimeSlot: 'Lunch',
  rating: 4,
  specialInstructions: 'Ring the bell',
};

const createMockPort = (overrides: Partial<OrderApiPort> = {}): OrderApiPort => ({
  fetchOrderByIdApi: async (orderId) =>
    orderId === 'order-my-1' ? listOrderRecord : null,
  fetchOrders: async () => [listOrderRecord, { ...listOrderRecord, id: 'order-my-2', orderNumber: 5002 }],
  requestGuestViewToken: async () => ({
    success: true,
    token: 'guest-token',
    expiresAt: '2026-06-27T10:00:00.000Z',
  }),
  ...overrides,
});

describe('MyOrders SDK read parity (PR-5)', () => {
  it('readModelToOrder preserves list UI fields', () => {
    const [model] = mapOrdersToReadModels([listOrderRecord]);
    const order = readModelToOrder(model);

    assert.equal(order.id, 'order-my-1');
    assert.equal(order.status, OrderStatus.DELIVERED);
    assert.equal(order.deliveryType, 'asap');
    assert.equal(order.deliveryTimeSlot, 'Lunch');
    assert.equal(order.rating, 4);
    assert.equal(order.specialInstructions, 'Ring the bell');
    assert.equal(order.feedbackStatus, FeedbackStatus.NOT_ELIGIBLE);
  });

  it('listOrdersForUser maps to MyOrders-compatible orders', async () => {
    const sdk = createOrderApiAdapter(createMockPort());
    const apiRecords = await createMockPort().fetchOrders('customer-uid');
    const expected = mapOrdersToReadModels(apiRecords).map(readModelToOrder);

    const result = await sdk.listOrdersForUser(
      { userId: 'customer-uid' as UserId },
      {}
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    const actual = result.value.map(readModelToOrder);
    assert.deepEqual(actual, expected);
    assert.equal(actual.length, 2);
  });

  it('getOrderById maps guest batch fetch shape', async () => {
    const sdk = createOrderApiAdapter(createMockPort());
    const result = await sdk.getOrderById('order-my-1' as OrderId);

    assert.equal(result.ok, true);
    if (!result.ok) return;

    const order = readModelToOrder(result.value);
    assert.equal(order.customerName, 'My Orders User');
    assert.equal(order.items[0].name, 'Thali');
  });

  it('listOrdersForUser returns empty-compatible result on validation failure', async () => {
    const sdk = createOrderApiAdapter(createMockPort());
    const result = await sdk.listOrdersForUser({}, {});

    assert.equal(result.ok, false);
  });
});

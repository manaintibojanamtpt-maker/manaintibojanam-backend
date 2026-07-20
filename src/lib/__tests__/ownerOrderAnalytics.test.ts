import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeOwnerOrderMetrics, formatInr } from '../ownerOrderAnalytics';
import type { Order } from '../../types';

describe('ownerOrderAnalytics (GA-2)', () => {
  it('computes today revenue, pending count, and top items', () => {
    const today = new Date();
    const orders: Order[] = [
      {
        id: '1',
        status: 'DELIVERED',
        totalAmount: 500,
        phone: '9999999999',
        createdAt: today,
        items: [
          {
            menuItemId: 'a',
            name: 'Biryani',
            unitPrice: 250,
            quantity: 2,
            lineSubtotal: 500,
            lineTotal: 500,
          },
        ],
      } as Order,
      {
        id: '2',
        status: 'PREPARING',
        totalAmount: 200,
        phone: '8888888888',
        createdAt: today,
        items: [
          {
            menuItemId: 'b',
            name: 'Paneer Tikka',
            unitPrice: 200,
            quantity: 1,
            lineSubtotal: 200,
            lineTotal: 200,
          },
        ],
      } as Order,
      {
        id: '3',
        status: 'CANCELLED',
        totalAmount: 100,
        createdAt: today,
        items: [],
      } as Order,
    ];

    const metrics = computeOwnerOrderMetrics(orders);

    assert.equal(metrics.todayOrderCount, 2);
    assert.equal(metrics.todayRevenue, 700);
    assert.equal(metrics.pendingCount, 1);
    assert.equal(metrics.totalOrders, 2);
    assert.equal(metrics.uniqueCustomers, 2);
    assert.equal(metrics.topItems[0]?.name, 'Biryani');
    assert.equal(metrics.recentOrders.length, 3);
  });

  it('formats INR currency', () => {
    assert.match(formatInr(1500), /1,500|₹/);
  });

  it('sorts recent orders by Firestore serialized createdAt', () => {
    const orders: Order[] = [
      {
        id: 'older',
        status: 'DELIVERED',
        totalAmount: 100,
        createdAt: { _seconds: 1_752_000_000, _nanoseconds: 0 },
        items: [],
      } as Order,
      {
        id: 'newer',
        status: 'DELIVERED',
        totalAmount: 200,
        createdAt: { _seconds: 1_752_086_400, _nanoseconds: 0 },
        items: [],
      } as Order,
    ];

    const metrics = computeOwnerOrderMetrics(orders);
    assert.equal(metrics.recentOrders[0]?.id, 'newer');
    assert.equal(metrics.recentOrders[1]?.id, 'older');
  });
});

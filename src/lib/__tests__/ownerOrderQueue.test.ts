import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatOwnerScheduleSlotLabel,
  isOwnerScheduledInActiveWindow,
  resolveOwnerDeliveryType,
  resolveOwnerScheduledTime,
  sortOwnerOrdersForQueue,
  splitOwnerOrdersBySchedule,
} from '../ownerOrderQueue';
import type { OwnerOrderSnapshot } from '../ownerOrderReadModelMapper';

const baseOrder = (overrides: Partial<OwnerOrderSnapshot> = {}): OwnerOrderSnapshot => ({
  id: 'order-1',
  totalAmount: 240,
  status: 'PLACED',
  createdAt: '2026-07-18T10:00:00.000Z',
  ...overrides,
});

describe('ownerOrderQueue', () => {
  it('sorts ASAP orders before scheduled orders', () => {
    const sorted = sortOwnerOrdersForQueue([
      baseOrder({
        id: 'scheduled',
        deliveryType: 'scheduled',
        scheduledFor: '2026-07-18T19:00:00.000Z',
        deliveryTimeSlot: 'Today, 7:00 PM - 8:00 PM',
      }),
      baseOrder({ id: 'asap', deliveryType: 'asap' }),
    ]);

    assert.equal(sorted[0].id, 'asap');
    assert.equal(sorted[1].id, 'scheduled');
  });

  it('sorts scheduled orders by scheduled time ascending', () => {
    const sorted = sortOwnerOrdersForQueue([
      baseOrder({
        id: 'later',
        deliveryType: 'scheduled',
        scheduledFor: '2026-07-19T19:00:00.000Z',
      }),
      baseOrder({
        id: 'sooner',
        deliveryType: 'scheduled',
        scheduledFor: '2026-07-18T19:00:00.000Z',
      }),
    ]);

    assert.equal(sorted[0].id, 'sooner');
    assert.equal(sorted[1].id, 'later');
  });

  it('moves scheduled orders to active queue 60 minutes before slot', () => {
    const scheduledFor = '2026-07-18T19:00:00.000Z';
    const orders = [
      baseOrder({
        id: 'future-scheduled',
        deliveryType: 'scheduled',
        scheduledFor,
        deliveryTimeSlot: 'Today, 7:00 PM - 8:00 PM',
      }),
      baseOrder({ id: 'asap', deliveryType: 'asap' }),
    ];

    const beforePrepWindow = splitOwnerOrdersBySchedule(orders, new Date('2026-07-18T17:29:00.000Z'));
    assert.deepEqual(
      beforePrepWindow.activeOrders.map((order) => order.id),
      ['asap'],
    );
    assert.deepEqual(
      beforePrepWindow.scheduledOrders.map((order) => order.id),
      ['future-scheduled'],
    );

    const inPrepWindow = splitOwnerOrdersBySchedule(orders, new Date('2026-07-18T18:00:00.000Z'));
    assert.deepEqual(
      inPrepWindow.activeOrders.map((order) => order.id),
      ['asap', 'future-scheduled'],
    );
    assert.equal(inPrepWindow.scheduledOrders.length, 0);
  });

  it('formats delivery slot labels for owner badges', () => {
    assert.equal(
      formatOwnerScheduleSlotLabel({
        id: 'order-1',
        totalAmount: 1,
        status: 'PLACED',
        createdAt: '2026-07-18T10:00:00.000Z',
        deliveryTimeSlot: 'Tomorrow, 7:00 PM - 8:00 PM',
      }),
      'Tomorrow 7-8 PM',
    );
  });

  it('infers scheduled delivery type from scheduledFor when deliveryType missing', () => {
    const order = baseOrder({ scheduledFor: '2026-07-18T19:00:00.000Z' });
    assert.equal(resolveOwnerDeliveryType(order), 'scheduled');
    assert.ok(resolveOwnerScheduledTime(order));
    assert.equal(
      isOwnerScheduledInActiveWindow(order, new Date('2026-07-18T18:00:00.000Z')),
      true,
    );
  });
});

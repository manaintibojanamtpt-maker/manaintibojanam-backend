import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASAP_SLOT,
  DEFAULT_SLOT_DURATION_MINUTES,
  buildDeliveryTimeSlots,
  getScheduledForTimestamp,
  isAsapSlot,
  validateMarketplaceSchedule,
} from '../deliveryTimeSlots.js';
import type { ResolvedStoreTiming } from '../tenantProjectionHelpers.js';

function openTiming(overrides: Partial<ResolvedStoreTiming> = {}): ResolvedStoreTiming {
  return {
    isStoreOpen: true,
    openTime: '09:00',
    closeTime: '22:00',
    businessHoursEnabled: true,
    timezone: 'Asia/Kolkata',
    ...overrides,
  };
}

describe('deliveryTimeSlots', () => {
  it('includes ASAP when kitchen is open during business hours', () => {
    const now = new Date('2026-07-17T12:00:00+05:30');
    const slots = buildDeliveryTimeSlots({ storeTiming: openTiming(), now, prepMinutes: 20 });
    assert.ok(slots.some((slot) => isAsapSlot(slot)));
    assert.ok(slots.some((slot) => slot.startsWith('Today,')));
  });

  it('uses 30-minute slots aligned to kitchen open time', () => {
    const now = new Date('2026-07-17T08:30:00+05:30');
    const slots = buildDeliveryTimeSlots({ storeTiming: openTiming(), now, prepMinutes: 20 });
    const firstScheduled = slots.find((slot) => !isAsapSlot(slot));
    assert.ok(firstScheduled);
    assert.match(firstScheduled!, /Today, 9:00 am - 9:30 am/i);
  });

  it('excludes past slots at 11:21 AM with kitchen open at 9 AM', () => {
    const now = new Date('2026-07-18T11:21:00+05:30');
    const slots = buildDeliveryTimeSlots({ storeTiming: openTiming(), now, prepMinutes: 20 });
    const todaySlots = slots.filter((slot) => slot.startsWith('Today,'));
    assert.equal(
      todaySlots.some((slot) => /9:00 am - 10:00 am/i.test(slot) || /9:00 am - 9:30 am/i.test(slot)),
      false,
    );
    assert.equal(
      todaySlots.some((slot) => /10:00 am - 10:30 am/i.test(slot) || /10:30 am - 11:00 am/i.test(slot)),
      false,
    );
    const firstScheduled = todaySlots[0];
    assert.ok(firstScheduled);
    assert.match(firstScheduled!, /Today, 12:00 pm - 12:30 pm/i);
  });

  it('excludes past slots when server clock is UTC but store is Asia/Kolkata', () => {
    const now = new Date('2026-07-18T05:51:00.000Z');
    const slots = buildDeliveryTimeSlots({ storeTiming: openTiming(), now, prepMinutes: 20 });
    const todaySlots = slots.filter((slot) => slot.startsWith('Today,'));
    assert.equal(todaySlots.some((slot) => /9:00 am - 9:30 am/i.test(slot)), false);
    assert.equal(todaySlots.some((slot) => /9:00 am - 10:00 am/i.test(slot)), false);
    const firstScheduled = todaySlots[0];
    assert.ok(firstScheduled);
    assert.match(firstScheduled!, /Today, 12:00 pm - 12:30 pm/i);
  });

  it('starts tomorrow slots at kitchen open time', () => {
    const now = new Date('2026-07-17T23:00:00+05:30');
    const slots = buildDeliveryTimeSlots({ storeTiming: openTiming(), now, prepMinutes: 20 });
    const firstTomorrow = slots.find((slot) => slot.startsWith('Tomorrow,'));
    assert.ok(firstTomorrow);
    assert.match(firstTomorrow!, /Tomorrow, 9:00 am - 9:30 am/i);
  });

  it('omits ASAP when kitchen is manually closed but keeps tomorrow slots', () => {
    const now = new Date('2026-07-17T12:00:00+05:30');
    const slots = buildDeliveryTimeSlots({
      storeTiming: openTiming({ isStoreOpen: false }),
      now,
      prepMinutes: 20,
    });
    assert.equal(slots.some((slot) => isAsapSlot(slot)), false);
    assert.ok(slots.some((slot) => slot.startsWith('Tomorrow,')));
  });

  it('defaults slot duration to 30 minutes', () => {
    assert.equal(DEFAULT_SLOT_DURATION_MINUTES, 30);
  });

  it('parses scheduled slot timestamps', () => {
    const now = new Date('2026-07-17T12:00:00+05:30');
    const ts = getScheduledForTimestamp('Tomorrow, 7:00 PM - 7:30 PM', now);
    assert.ok(ts);
    const parsed = new Date(ts!);
    assert.equal(parsed.getDate(), 18);
    assert.equal(parsed.getHours(), 19);
  });

  it('accepts asap orders when kitchen is open', () => {
    const now = new Date('2026-07-17T12:00:00+05:30');
    const result = validateMarketplaceSchedule({ deliveryType: 'asap' }, openTiming(), 20, now);
    assert.equal(result.deliveryType, 'asap');
    assert.equal(result.deliveryTimeSlot, 'ASAP');
    assert.equal(result.scheduledFor, null);
  });

  it('rejects asap when kitchen is closed', () => {
    const now = new Date('2026-07-17T12:00:00+05:30');
    assert.throws(
      () =>
        validateMarketplaceSchedule(
          { deliveryType: 'asap' },
          openTiming({ isStoreOpen: false }),
          20,
          now,
        ),
      /Kitchen is closed/,
    );
  });

  it('requires scheduledFor for scheduled orders', () => {
    const now = new Date('2026-07-17T12:00:00+05:30');
    assert.throws(
      () => validateMarketplaceSchedule({ deliveryType: 'scheduled' }, openTiming(), 20, now),
      /scheduledFor/,
    );
  });

  it('rejects past scheduledFor timestamps', () => {
    const now = new Date('2026-07-18T11:21:00+05:30');
    assert.throws(
      () =>
        validateMarketplaceSchedule(
          {
            deliveryType: 'scheduled',
            scheduledFor: '2026-07-18T05:00:00.000Z',
            deliveryTimeSlot: 'Today, 9:00 AM - 9:30 AM',
          },
          openTiming(),
          20,
          now,
        ),
      /Scheduled time must be in the future|Scheduled time must allow enough lead time|Scheduled time must fall within/,
    );
  });

  it('accepts valid scheduled orders within available slots', () => {
    const now = new Date('2026-07-17T12:00:00+05:30');
    const slots = buildDeliveryTimeSlots({ storeTiming: openTiming(), now, prepMinutes: 20 });
    const scheduledSlot = slots.find((slot) => !isAsapSlot(slot));
    assert.ok(scheduledSlot);
    const scheduledFor = getScheduledForTimestamp(scheduledSlot!, now);
    const result = validateMarketplaceSchedule(
      {
        deliveryType: 'scheduled',
        scheduledFor: scheduledFor ?? undefined,
        deliveryTimeSlot: scheduledSlot,
      },
      openTiming(),
      20,
      now,
    );
    assert.equal(result.deliveryType, 'scheduled');
    assert.equal(result.deliveryTimeSlot, scheduledSlot);
    assert.ok(result.scheduledFor);
  });

  it('exports ASAP slot label constant', () => {
    assert.equal(ASAP_SLOT, 'Standard Delivery (ASAP)');
  });
});

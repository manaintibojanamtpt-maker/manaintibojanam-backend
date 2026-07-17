import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASAP_SLOT,
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

  it('parses scheduled slot timestamps', () => {
    const now = new Date('2026-07-17T12:00:00+05:30');
    const ts = getScheduledForTimestamp('Tomorrow, 7:00 PM - 8:00 PM', now);
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

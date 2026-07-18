import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckoutPayload } from '../src/features/checkout/domain/checkoutPayload';
import {
  buildScheduleFields,
  formatDeliverySlotLabel,
  getScheduledForTimestamp,
  isAsapSlot,
  resolveDefaultDeliverySlot,
} from '../src/features/checkout/domain/deliveryTimeSlots';

describe('checkout delivery schedule payload', () => {
  it('builds asap payload by default', () => {
    const payload = buildCheckoutPayload([], 'rest_1', 'ctx_1', null, 'ASAP');
    assert.equal(payload.deliveryType, 'asap');
    assert.equal(payload.deliveryTimeSlot, 'ASAP');
    assert.equal(payload.scheduledFor, undefined);
  });

  it('builds scheduled payload from slot label', () => {
    const slot = 'Today, 7:00 PM - 8:00 PM';
    const fields = buildScheduleFields(slot);
    assert.equal(fields.deliveryType, 'scheduled');
    assert.equal(fields.deliveryTimeSlot, slot);
    assert.ok(fields.scheduledFor);

    const payload = buildCheckoutPayload([], 'rest_1', 'ctx_1', null, slot);
    assert.equal(payload.deliveryType, 'scheduled');
    assert.equal(payload.scheduledFor, fields.scheduledFor);
  });

  it('formats slot labels for summary display', () => {
    assert.equal(formatDeliverySlotLabel('Today, 7:00 PM - 8:00 PM'), '7:00 PM - 8:00 PM');
    assert.equal(isAsapSlot('Standard Delivery (ASAP)'), true);
  });

  it('defaults to first available server slot', () => {
    const slots = ['Standard Delivery (ASAP)', 'Tomorrow, 1:00 PM - 1:30 PM'];
    assert.equal(resolveDefaultDeliverySlot(slots), 'Standard Delivery (ASAP)');
    assert.ok(getScheduledForTimestamp('Tomorrow, 1:00 PM - 1:30 PM'));
  });

  it('defaults to first valid slot when asap is unavailable', () => {
    const slots = ['Today, 12:00 PM - 12:30 PM', 'Tomorrow, 9:00 AM - 9:30 AM'];
    assert.equal(resolveDefaultDeliverySlot(slots), 'Today, 12:00 PM - 12:30 PM');
  });
});

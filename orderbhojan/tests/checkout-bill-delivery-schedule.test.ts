import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatBillDeliveryScheduleLine } from '../src/features/checkout/domain/checkoutDeliveryDisplay.ts';

describe('formatBillDeliveryScheduleLine', () => {
  it('ASAP → Delivery / Deliver now', () => {
    const line = formatBillDeliveryScheduleLine({
      deliveryTimeSlot: 'Standard Delivery (ASAP)',
      voiceScheduleNotice: null,
    });
    assert.deepEqual(line, { label: 'Delivery', amountLabel: 'Deliver now' });
  });

  it('Scheduled slot → Delivery / Scheduled for {slot label}', () => {
    const line = formatBillDeliveryScheduleLine({
      deliveryTimeSlot: 'Today, 8:00 PM - 8:30 PM',
      voiceScheduleNotice: { kind: 'applied' },
    });
    assert.equal(line?.label, 'Delivery');
    assert.equal(line?.amountLabel, 'Scheduled for 8:00 PM - 8:30 PM');
  });

  it('Voice clarify → Delivery / Schedule unclear — please select a time', () => {
    const line = formatBillDeliveryScheduleLine({
      deliveryTimeSlot: 'Standard Delivery (ASAP)',
      voiceScheduleNotice: { kind: 'clarify' },
    });
    assert.deepEqual(line, {
      label: 'Delivery',
      amountLabel: 'Schedule unclear — please select a time',
    });
  });

  it('Voice error → Delivery / Schedule unavailable — please select a time', () => {
    const line = formatBillDeliveryScheduleLine({
      deliveryTimeSlot: 'Standard Delivery (ASAP)',
      voiceScheduleNotice: { kind: 'error' },
    });
    assert.deepEqual(line, {
      label: 'Delivery',
      amountLabel: 'Schedule unavailable — please select a time',
    });
  });

  it('Notice cleared after manual slot pick → Delivery / Scheduled for {slot label}', () => {
    const line = formatBillDeliveryScheduleLine({
      deliveryTimeSlot: 'Today, 8:00 PM - 8:30 PM',
      voiceScheduleNotice: null,
    });
    assert.deepEqual(line, {
      label: 'Delivery',
      amountLabel: 'Scheduled for 8:00 PM - 8:30 PM',
    });
  });

  it('returns null when no slot and no clarify/error notice', () => {
    assert.equal(formatBillDeliveryScheduleLine({ deliveryTimeSlot: '', voiceScheduleNotice: null }), null);
    assert.equal(formatBillDeliveryScheduleLine({ voiceScheduleNotice: { kind: 'applied' } }), null);
  });
});

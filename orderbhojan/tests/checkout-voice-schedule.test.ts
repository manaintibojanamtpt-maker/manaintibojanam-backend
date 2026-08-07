import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeDeliveryScheduleActions,
  pickLatestDeliverySchedulePreference,
  pickScheduleVoiceFeedback,
} from '../src/features/checkout/domain/deliveryScheduleFromAssist.ts';
import {
  resolveSlotFromScheduleAction,
  tryResolveSlotFromScheduleAction,
} from '../src/features/checkout/domain/resolveVoiceScheduleSlot.ts';

describe('delivery schedule from voice assist', () => {
  it('parses set_delivery_schedule typed actions', () => {
    const prefs = normalizeDeliveryScheduleActions([
      {
        type: 'set_delivery_schedule',
        payload: {
          deliveryType: 'asap',
          deliveryTimeSlot: 'ASAP',
          slotLabel: 'ASAP',
        },
      },
    ]);
    assert.equal(prefs.length, 1);
    assert.equal(prefs[0]?.deliveryType, 'asap');
  });

  it('parses assist none + action stub from mapWorkflowToAssistResponse', () => {
    const pref = pickLatestDeliverySchedulePreference([
      {
        type: 'none',
        reason: 'set_delivery_schedule',
        payload: {
          action: 'set_delivery_schedule',
          deliveryType: 'scheduled',
          deliveryTimeSlot: 'Today, 8:00 PM - 8:30 PM',
          slotLabel: '8:00 PM',
          scheduledFor: '2026-08-06T14:30:00.000Z',
        },
      },
    ]);
    assert.ok(pref);
    assert.equal(pref?.deliveryType, 'scheduled');
    assert.match(pref?.slotLabel ?? '', /8:00 PM/);
  });

  it('parses schedule clarify from ask_clarification / schedule_clarify stub', () => {
    const feedback = pickScheduleVoiceFeedback(
      [
        {
          type: 'none',
          reason: 'schedule_clarify',
          payload: {
            action: 'schedule_clarify',
            reason: 'AmbiguousDeliveryTime',
            missingEntities: ['DeliveryTime'],
          },
        },
      ],
      'Please say a clear time — now, 8 PM, or tomorrow lunch.',
    );
    assert.ok(feedback);
    assert.equal(feedback?.kind, 'clarify');
    assert.equal(feedback?.reason, 'AmbiguousDeliveryTime');
    assert.match(feedback?.message ?? '', /clear time/i);
  });

  it('marks InvalidDeliveryTime as error feedback', () => {
    const feedback = pickScheduleVoiceFeedback(
      [
        {
          type: 'none',
          reason: 'schedule_clarify',
          payload: {
            action: 'schedule_clarify',
            reason: 'InvalidDeliveryTime',
            missingEntities: ['DeliveryTime'],
          },
        },
      ],
      'That time isn’t available. Try now, or pick another slot.',
    );
    assert.equal(feedback?.kind, 'error');
  });

  it('resolves ASAP preference onto kitchen ASAP slot', () => {
    const slots = ['Standard Delivery (ASAP)', 'Today, 7:00 PM - 7:30 PM'];
    const resolved = resolveSlotFromScheduleAction(
      { deliveryType: 'asap', deliveryTimeSlot: 'ASAP' },
      slots,
    );
    assert.equal(resolved, 'Standard Delivery (ASAP)');
  });

  it('resolves scheduled preference onto a matching kitchen slot', () => {
    const slots = ['Standard Delivery (ASAP)', 'Today, 8:00 PM - 8:30 PM', 'Tomorrow, Lunch'];
    const resolved = resolveSlotFromScheduleAction(
      {
        deliveryType: 'scheduled',
        deliveryTimeSlot: 'Today, 8:00 PM - 8:30 PM',
        slotLabel: '8:00 PM',
      },
      slots,
    );
    assert.equal(resolved, 'Today, 8:00 PM - 8:30 PM');
  });

  it('strict resolve fails when ASAP is unavailable (kitchen closed path)', () => {
    const slots = ['Today, 8:00 PM - 8:30 PM', 'Tomorrow, Lunch'];
    const resolved = tryResolveSlotFromScheduleAction(
      { deliveryType: 'asap', deliveryTimeSlot: 'ASAP' },
      slots,
      {
        isStoreOpen: false,
        closedMessage: 'Kitchen closed for Deliver now.',
        deliverySlots: slots,
        prepMinutes: 30,
        storeTiming: {
          openTime: '10:00',
          closeTime: '22:00',
          businessHoursEnabled: true,
        },
      },
    );
    assert.equal(resolved.ok, false);
    if (!resolved.ok) {
      assert.equal(resolved.reason, 'kitchen_closed');
      assert.match(resolved.message, /Kitchen closed|Deliver now/i);
    }
  });

  it('strict resolve fails when scheduled time has no kitchen match', () => {
    const slots = ['Standard Delivery (ASAP)', 'Today, 7:00 PM - 7:30 PM'];
    const resolved = tryResolveSlotFromScheduleAction(
      {
        deliveryType: 'scheduled',
        deliveryTimeSlot: 'Today, 11:00 PM - 11:30 PM',
        slotLabel: '11:00 PM',
      },
      slots,
    );
    assert.equal(resolved.ok, false);
    if (!resolved.ok) {
      assert.equal(resolved.reason, 'no_match');
    }
  });

  it('resolves tomorrow preference onto a matching Tomorrow kitchen slot', () => {
    const slots = ['Standard Delivery (ASAP)', 'Today, 7:00 PM - 7:30 PM', 'Tomorrow, 8:00 PM - 8:30 PM'];
    const resolved = tryResolveSlotFromScheduleAction(
      {
        deliveryType: 'scheduled',
        deliveryTimeSlot: 'Tomorrow, 8:00 PM - 8:30 PM',
        slotLabel: 'Tomorrow 8:00 PM',
      },
      slots,
    );
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(resolved.slot, 'Tomorrow, 8:00 PM - 8:30 PM');
    }
  });

  it('no_match when Tomorrow is wanted but kitchen only has Today', () => {
    const slots = ['Standard Delivery (ASAP)', 'Today, 7:00 PM - 7:30 PM'];
    const resolved = tryResolveSlotFromScheduleAction(
      {
        deliveryType: 'scheduled',
        deliveryTimeSlot: 'Tomorrow, 8:00 PM - 8:30 PM',
        slotLabel: 'Tomorrow 8:00 PM',
      },
      slots,
    );
    assert.equal(resolved.ok, false);
    if (!resolved.ok) {
      assert.equal(resolved.reason, 'no_match');
      assert.match(resolved.message, /no Tomorrow slots/i);
    }
  });
});

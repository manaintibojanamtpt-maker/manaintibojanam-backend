import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ScheduleDeliveryRule } from '../workflow/intent/rules/ScheduleDeliveryRule.js';
import { ConversationIntent } from '../models/ConversationIntent.js';
import type { DeliveryTimeEntity } from '../models/ConversationEntity.js';

describe('ScheduleDeliveryRule', () => {
  const rule = new ScheduleDeliveryRule();

  it('proceeds for ASAP DeliveryTime entity', () => {
    const entity: DeliveryTimeEntity = {
      type: 'DeliveryTime',
      rawValue: 'asap',
      mode: 'asap',
      deliveryTimeSlot: 'ASAP',
      slotLabel: 'ASAP',
    };
    const result = rule.resolve('asap', { entities: [entity] });
    assert.equal(result.intent, ConversationIntent.ScheduleDelivery);
    assert.equal(result.requiresClarification, false);
    assert.ok((result.confidence ?? 0) >= 0.9);
  });

  it('clarifies when schedule is ambiguous', () => {
    const entity: DeliveryTimeEntity = {
      type: 'DeliveryTime',
      rawValue: 'later',
      mode: 'scheduled',
      ambiguous: true,
    };
    const result = rule.resolve('schedule later', { entities: [entity] });
    assert.equal(result.intent, ConversationIntent.ScheduleDelivery);
    assert.equal(result.requiresClarification, true);
    assert.equal(result.clarificationReason, 'AmbiguousDeliveryTime');
  });

  it('clarifies out-of-horizon day after without proceeding', () => {
    const entity: DeliveryTimeEntity = {
      type: 'DeliveryTime',
      rawValue: 'day after',
      normalizedValue: 'out_of_horizon',
      mode: 'scheduled',
    };
    const result = rule.resolve('day after lunch', { entities: [entity] });
    assert.equal(result.requiresClarification, true);
    assert.equal(result.clarificationReason, 'OutOfHorizonDeliveryTime');
  });

  it('matches day after and tomorrow hints', () => {
    assert.equal(rule.matches('day after tomorrow'), true);
    assert.equal(rule.matches('tomorrow 8 pm'), true);
  });
});

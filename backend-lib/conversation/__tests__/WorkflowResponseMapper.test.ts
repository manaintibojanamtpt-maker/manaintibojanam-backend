import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { WorkflowResponseMapper } from '../workflow/WorkflowResponseMapper.js';
import { createDefaultWorkflowEngine } from '../workflow/WorkflowEngine.js';
import { ConversationIntent } from '../models/ConversationIntent.js';
import { ConversationStatus } from '../models/ConversationState.js';
import type { ConversationState } from '../models/ConversationState.js';

const SAMPLE_MENU = [{ id: 'item_cb', name: 'Chicken Biryani' }] as const;

function baseState(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    sessionId: 'sess_1',
    conversationId: 'sess_1',
    tenantId: 'tenant_1',
    currentLanguage: 'en',
    currentIntent: null,
    detectedEntities: [],
    currentWorkflowStep: null,
    pendingQuestion: null,
    pendingConfirmation: false,
    currentCartReference: null,
    status: ConversationStatus.Idle,
    createdTime: 1000,
    updatedTime: 1000,
    metadata: {},
    historyReference: null,
    ...overrides,
  };
}

describe('WorkflowResponseMapper', () => {
  const engine = createDefaultWorkflowEngine({ menu: SAMPLE_MENU });
  const mapper = new WorkflowResponseMapper();

  it('maps greeting proceed to greet reply + action', () => {
    const turn = engine.evaluateTurn({ rawTranscript: 'Hello', state: baseState() });
    const response = mapper.map(turn);
    assert.strictEqual(response.decision, 'proceed');
    assert.strictEqual(response.intent, ConversationIntent.Greeting);
    assert.strictEqual(response.success, true);
    assert.match(response.systemReply, /Hello/i);
    assert.strictEqual(response.proposedActions[0]?.type, 'greet');
  });

  it('maps AddItem proceed to add_item action with menuItemId', () => {
    const turn = engine.evaluateTurn({
      rawTranscript: 'add 2 chicken biryani',
      state: baseState(),
    });
    const response = mapper.map(turn);
    assert.strictEqual(response.decision, 'proceed');
    assert.strictEqual(response.proposedActions[0]?.type, 'add_item');
    assert.strictEqual(response.proposedActions[0]?.payload?.menuItemId, 'item_cb');
    assert.strictEqual(response.proposedActions[0]?.payload?.quantity, 2);
    assert.match(response.systemReply, /Chicken Biryani/i);
  });

  it('maps clarify MissingFoodItem to ask for the item', () => {
    const turn = engine.evaluateTurn({
      rawTranscript: 'add something',
      state: baseState(),
    });
    const response = mapper.map(turn);
    assert.strictEqual(response.decision, 'clarify');
    assert.strictEqual(response.proposedActions[0]?.type, 'ask_clarification');
    assert.match(response.systemReply, /Which item/i);
  });

  it('maps deny empty-cart checkout to cart-empty reply', () => {
    const turn = engine.evaluateTurn({
      rawTranscript: 'get the bill',
      state: baseState({ currentCartReference: null }),
    });
    const response = mapper.map(turn);
    assert.strictEqual(response.decision, 'deny');
    assert.strictEqual(response.success, false);
    assert.strictEqual(response.proposedActions[0]?.type, 'policy_denied');
    assert.match(response.systemReply, /cart is empty/i);
  });

  it('maps address clarification for checkout', () => {
    const turn = engine.evaluateTurn({
      rawTranscript: 'checkout please',
      state: baseState({ currentCartReference: 'cart_123' }),
    });
    const response = mapper.map(turn);
    assert.strictEqual(response.decision, 'clarify');
    assert.match(response.systemReply, /delivery address/i);
  });

  it('maps deliver now to set_delivery_schedule ASAP', () => {
    const turn = engine.evaluateTurn({
      rawTranscript: 'deliver now',
      state: baseState(),
    });
    const response = mapper.map(turn);
    assert.strictEqual(response.decision, 'proceed');
    assert.strictEqual(response.intent, ConversationIntent.ScheduleDelivery);
    assert.strictEqual(response.proposedActions[0]?.type, 'set_delivery_schedule');
    assert.strictEqual(response.proposedActions[0]?.payload?.deliveryType, 'asap');
    assert.match(response.systemReply, /as soon as possible/i);
  });

  it('maps for 8 pm to scheduled delivery action', () => {
    const turn = engine.evaluateTurn({
      rawTranscript: 'for 8 pm',
      state: baseState(),
    });
    const response = mapper.map(turn);
    assert.strictEqual(response.decision, 'proceed');
    assert.strictEqual(response.proposedActions[0]?.type, 'set_delivery_schedule');
    assert.strictEqual(response.proposedActions[0]?.payload?.deliveryType, 'scheduled');
    assert.match(response.systemReply, /scheduled for/i);
  });

  it('clarifies ambiguous schedule later', () => {
    const turn = engine.evaluateTurn({
      rawTranscript: 'schedule later',
      state: baseState(),
    });
    const response = mapper.map(turn);
    assert.strictEqual(response.decision, 'clarify');
    assert.match(response.systemReply, /clear time|when should we deliver/i);
    assert.strictEqual(response.proposedActions[0]?.type, 'ask_clarification');
    assert.ok(
      response.proposedActions[0]?.payload?.reason === 'AmbiguousDeliveryTime' ||
        response.proposedActions[0]?.payload?.reason === 'MissingDeliveryTime',
    );
  });

  it('maps tomorrow 8 pm to set_delivery_schedule with Tomorrow hint', () => {
    const turn = engine.evaluateTurn({
      rawTranscript: 'tomorrow 8 pm',
      state: baseState(),
    });
    const response = mapper.map(turn);
    assert.strictEqual(response.decision, 'proceed');
    assert.strictEqual(response.proposedActions[0]?.type, 'set_delivery_schedule');
    assert.strictEqual(response.proposedActions[0]?.payload?.deliveryType, 'scheduled');
    assert.match(String(response.proposedActions[0]?.payload?.deliveryTimeSlot ?? ''), /Tomorrow/);
  });

  it('clarifies day after lunch as out of horizon (no set_delivery_schedule)', () => {
    const turn = engine.evaluateTurn({
      rawTranscript: 'day after lunch',
      state: baseState(),
    });
    const response = mapper.map(turn);
    assert.strictEqual(response.decision, 'clarify');
    assert.match(response.systemReply, /Today or Tomorrow|tomorrow 8 PM/i);
    assert.strictEqual(response.proposedActions[0]?.type, 'ask_clarification');
    assert.notEqual(response.proposedActions[0]?.type, 'set_delivery_schedule');
    assert.ok(
      response.proposedActions[0]?.payload?.reason === 'OutOfHorizonDeliveryTime' ||
        turn.reason === 'OutOfHorizonDeliveryTime',
    );
  });
});

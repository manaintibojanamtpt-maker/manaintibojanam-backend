import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  WorkflowEngine,
  createDefaultWorkflowEngine,
} from '../workflow/WorkflowEngine.js';
import { ConversationIntent } from '../models/ConversationIntent.js';
import { ConversationStatus } from '../models/ConversationState.js';
import type { ConversationState } from '../models/ConversationState.js';

const SAMPLE_MENU = [
  { id: 'item_cb', name: 'Chicken Biryani' },
] as const;

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

describe('WorkflowEngine', () => {
  const engine = createDefaultWorkflowEngine({ menu: SAMPLE_MENU });

  it('proceeds on greeting', () => {
    const result = engine.evaluateTurn({
      rawTranscript: 'Hello',
      state: baseState(),
    });
    assert.strictEqual(result.kind, 'proceed');
    assert.strictEqual(result.intent, ConversationIntent.Greeting);
    assert.strictEqual(result.policy?.allowed, true);
  });

  it('proceeds on AddItem when food is extracted from menu', () => {
    const result = engine.evaluateTurn({
      rawTranscript: 'add 2 chicken biryani',
      state: baseState(),
    });
    assert.strictEqual(result.kind, 'proceed');
    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.strictEqual(result.confidence, 1.0);
    assert.ok(result.entities.some((e) => e.type === 'FoodItem'));
  });

  it('clarifies when AddItem verb has no food item', () => {
    const result = engine.evaluateTurn({
      rawTranscript: 'add something',
      state: baseState(),
    });
    assert.strictEqual(result.kind, 'clarify');
    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.ok(result.requiresClarification);
  });

  it('clarifies on unknown noise', () => {
    const result = engine.evaluateTurn({
      rawTranscript: 'what is the weather like today',
      state: baseState(),
    });
    assert.strictEqual(result.kind, 'clarify');
    assert.strictEqual(result.intent, ConversationIntent.Unknown);
  });

  it('denies checkout when cart is missing', () => {
    const result = engine.evaluateTurn({
      rawTranscript: 'get the bill',
      state: baseState({ currentCartReference: null }),
    });
    assert.strictEqual(result.kind, 'deny');
    assert.strictEqual(result.intent, ConversationIntent.Checkout);
    assert.match(result.reason || '', /Cart is empty/);
  });

  it('clarifies checkout when cart exists but address is missing', () => {
    const result = engine.evaluateTurn({
      rawTranscript: 'checkout please',
      state: baseState({ currentCartReference: 'cart_123' }),
    });
    assert.strictEqual(result.kind, 'clarify');
    assert.strictEqual(result.intent, ConversationIntent.Checkout);
    assert.ok(result.missingEntities?.includes('Address'));
  });
});

describe('createDefaultWorkflowEngine', () => {
  it('returns a WorkflowEngine instance', () => {
    assert.ok(createDefaultWorkflowEngine() instanceof WorkflowEngine);
  });
});

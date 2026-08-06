import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ConversationTurnOrchestrator,
  createDefaultTurnOrchestrator,
} from '../workflow/ConversationTurnOrchestrator.js';
import { ConversationIntent } from '../models/ConversationIntent.js';
import { ConversationStatus } from '../models/ConversationState.js';
import type { ConversationState } from '../models/ConversationState.js';

const SAMPLE_MENU = [{ id: 'item_cb', name: 'Chicken Biryani' }] as const;
const NOW = 1_700_000_000_000;

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

describe('ConversationTurnOrchestrator', () => {
  const orchestrator = createDefaultTurnOrchestrator({ menu: SAMPLE_MENU });

  it('handles greeting: proceed reply + Speaking state', () => {
    const output = orchestrator.handleTurn({
      rawTranscript: 'Hello',
      state: baseState(),
      now: NOW,
    });

    assert.strictEqual(output.turn.kind, 'proceed');
    assert.strictEqual(output.response.intent, ConversationIntent.Greeting);
    assert.match(output.response.systemReply, /Hello/i);
    assert.strictEqual(output.nextState.status, ConversationStatus.Speaking);
    assert.strictEqual(output.nextState.currentIntent, ConversationIntent.Greeting);
    assert.strictEqual(output.nextState.updatedTime, NOW);
    assert.strictEqual(output.nextState.pendingQuestion, null);
  });

  it('handles AddItem proceed with projected entities', () => {
    const output = orchestrator.handleTurn({
      rawTranscript: 'add 2 chicken biryani',
      state: baseState(),
      now: NOW,
    });

    assert.strictEqual(output.turn.kind, 'proceed');
    assert.strictEqual(output.response.proposedActions[0]?.type, 'add_item');
    assert.ok(output.nextState.detectedEntities.some((e) => e.type === 'FoodItem'));
    assert.strictEqual(output.nextState.currentWorkflowStep, 'proceed');
  });

  it('handles clarify: WaitingForClarification + pendingQuestion', () => {
    const output = orchestrator.handleTurn({
      rawTranscript: 'add something',
      state: baseState(),
      now: NOW,
    });

    assert.strictEqual(output.turn.kind, 'clarify');
    assert.strictEqual(
      output.nextState.status,
      ConversationStatus.WaitingForClarification,
    );
    assert.strictEqual(output.nextState.pendingQuestion, output.response.systemReply);
    assert.match(output.nextState.pendingQuestion || '', /Which item/i);
  });

  it('handles deny: Listening status and unsuccessful response', () => {
    const output = orchestrator.handleTurn({
      rawTranscript: 'get the bill',
      state: baseState({ currentCartReference: null }),
      now: NOW,
    });

    assert.strictEqual(output.turn.kind, 'deny');
    assert.strictEqual(output.response.success, false);
    assert.strictEqual(output.nextState.status, ConversationStatus.Listening);
  });

  it('does not mutate the input state object', () => {
    const state = baseState();
    const before = structuredClone(state);
    orchestrator.handleTurn({
      rawTranscript: 'Hello',
      state,
      now: NOW,
    });
    assert.deepEqual(state, before);
  });
});

describe('createDefaultTurnOrchestrator', () => {
  it('returns a ConversationTurnOrchestrator instance', () => {
    assert.ok(createDefaultTurnOrchestrator() instanceof ConversationTurnOrchestrator);
  });
});

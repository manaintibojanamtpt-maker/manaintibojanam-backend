import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  blockPlaceOrderWithoutConfirm,
  canApplyConfirmedChange,
  createToolCallId,
  createVoiceSession,
  initialConfirmationSnapshot,
  isMutatingVoiceTool,
  nextVoiceRuntimeState,
  reduceConfirmation,
  resetVoiceTelemetryCountersForTests,
  emitVoiceTelemetry,
  getVoiceTelemetryCounters,
  shouldEscalateForClarificationLoop,
  triageVoiceUtterance,
  type OrderingTaskSnapshot,
} from '../src/index.ts';

describe('voice-core session', () => {
  it('creates a session with product and channel', () => {
    const session = createVoiceSession({ product: 'orderbhojan', channel: 'android' });
    assert.equal(session.product, 'orderbhojan');
    assert.equal(session.channel, 'android');
    assert.match(session.sessionId, /^vs_/);
  });
});

describe('voice runtime FSM', () => {
  it('blocks overlapping listen while speaking', () => {
    const speaking = nextVoiceRuntimeState('thinking', 'SPEAK');
    assert.equal(speaking, 'speaking');
    assert.equal(nextVoiceRuntimeState(speaking, 'START_LISTEN'), 'listening');
  });
});

describe('confirmation state machine', () => {
  it('never applies on bare confirm while clarifying', () => {
    let state = initialConfirmationSnapshot();
    state = reduceConfirmation(state, {
      type: 'SET_PENDING',
      pending: {
        planId: 'p1',
        status: 'needs_clarification',
        clarificationQuestion: 'Which dosa?',
      },
    });
    state = reduceConfirmation(state, { type: 'USER_UTTERANCE', message: 'yes' });
    assert.equal(state.phase, 'awaiting_clarification');
    assert.equal(canApplyConfirmedChange(state), false);
  });

  it('applies only after validated + explicit confirm', () => {
    let state = initialConfirmationSnapshot();
    state = reduceConfirmation(state, {
      type: 'SET_PENDING',
      pending: { planId: 'p2', status: 'validated', valid: true, summarySpeech: '2 dosa' },
    });
    assert.equal(state.phase, 'awaiting_confirm');
    state = reduceConfirmation(state, { type: 'USER_UTTERANCE', message: 'confirm' });
    assert.equal(state.phase, 'ready_to_apply');
    assert.equal(canApplyConfirmedChange(state), true);
  });

  it('applies on natural confirm-and-add when validated', () => {
    let state = reduceConfirmation(initialConfirmationSnapshot(), {
      type: 'SET_PENDING',
      pending: { planId: 'p2b', status: 'validated', valid: true },
    });
    state = reduceConfirmation(state, {
      type: 'USER_UTTERANCE',
      message: 'confirm Andhra add to cart',
    });
    assert.equal(state.phase, 'ready_to_apply');
    assert.equal(canApplyConfirmedChange(state), true);
  });

  it('discards on cancel', () => {
    let state = reduceConfirmation(initialConfirmationSnapshot(), {
      type: 'SET_PENDING',
      pending: { planId: 'p3', status: 'validated', valid: true },
    });
    state = reduceConfirmation(state, { type: 'USER_UTTERANCE', message: 'cancel' });
    assert.equal(state.phase, 'discarded');
    assert.equal(state.pending, null);
  });
});

describe('tool contracts', () => {
  it('marks cart mutations as mutating tools', () => {
    assert.equal(isMutatingVoiceTool('addItemToCart'), true);
    assert.equal(isMutatingVoiceTool('getCartSummary'), false);
    assert.equal(isMutatingVoiceTool('placeOrder'), true);
  });

  it('blocks placeOrder without confirm and still refuses execution in phase 1', () => {
    const denied = blockPlaceOrderWithoutConfirm({
      cartId: 'c1',
      userConfirmed: false,
    });
    assert.equal(denied?.code, 'NEEDS_CONFIRMATION');

    const blocked = blockPlaceOrderWithoutConfirm({
      cartId: 'c1',
      userConfirmed: true,
    });
    assert.equal(blocked?.code, 'NOT_SUPPORTED');
    assert.match(createToolCallId(), /^tc_/);
  });
});

describe('triage orchestrator', () => {
  const idleTask: OrderingTaskSnapshot = {
    state: 'idle',
    clarificationCount: 0,
  };

  it('routes add utterances to propose_cart_add tool', () => {
    const { decision } = triageVoiceUtterance({
      message: 'add 2 masala dosa from Lucky Kitchen',
      confirmation: initialConfirmationSnapshot(),
      task: idleTask,
    });
    assert.equal(decision.kind, 'propose_cart_add');
    if (decision.kind === 'propose_cart_add') {
      assert.equal(decision.tool.tool, 'addItemToCart');
      assert.equal(decision.tool.args.quantity, 2);
      assert.equal(decision.tool.args.itemName, 'masala dosa');
      assert.equal(decision.tool.args.kitchenHint, 'Lucky Kitchen');
    }
  });

  it('routes cart summary requests', () => {
    const { decision } = triageVoiceUtterance({
      message: 'what is in my cart',
      confirmation: initialConfirmationSnapshot(),
      task: idleTask,
    });
    assert.equal(decision.kind, 'cart_summary');
  });

  it('routes pending-item questions to cart summary', () => {
    const { decision } = triageVoiceUtterance({
      message: 'item that was added in the cart',
      confirmation: initialConfirmationSnapshot(),
      task: idleTask,
    });
    assert.equal(decision.kind, 'cart_summary');
  });

  it('routes natural confirm-and-add to apply when validated', () => {
    const confirmation = reduceConfirmation(initialConfirmationSnapshot(), {
      type: 'SET_PENDING',
      pending: { planId: 'p-confirm', status: 'validated', valid: true },
    });
    const { decision } = triageVoiceUtterance({
      message: 'confirm and add to cart',
      confirmation,
      task: idleTask,
    });
    assert.equal(decision.kind, 'apply_confirmed_change');
  });

  it('escalates after clarification loop threshold', () => {
    const confirmation = reduceConfirmation(initialConfirmationSnapshot(), {
      type: 'SET_PENDING',
      pending: {
        planId: 'p4',
        status: 'needs_clarification',
        clarificationQuestion: 'Which item?',
      },
    });
    const { decision } = triageVoiceUtterance({
      message: 'yes',
      confirmation,
      task: { state: 'needs_clarification', clarificationCount: 3 },
    });
    assert.equal(decision.kind, 'escalate');
    assert.equal(shouldEscalateForClarificationLoop({ state: 'needs_clarification', clarificationCount: 3 }), true);
  });
});

describe('telemetry', () => {
  it('counts turns and tool outcomes', () => {
    resetVoiceTelemetryCountersForTests();
    emitVoiceTelemetry({
      type: 'turn_started',
      sessionId: 's1',
      conversationId: 'c1',
    });
    emitVoiceTelemetry({
      type: 'tool_called',
      sessionId: 's1',
      tool: 'addItemToCart',
      callId: 'tc1',
      ok: true,
    });
    emitVoiceTelemetry({
      type: 'tool_called',
      sessionId: 's1',
      tool: 'placeOrder',
      callId: 'tc2',
      ok: false,
      code: 'NOT_SUPPORTED',
    });
    const counters = getVoiceTelemetryCounters();
    assert.equal(counters.turns, 1);
    assert.equal(counters.toolOk, 1);
    assert.equal(counters.toolFail, 1);
  });
});

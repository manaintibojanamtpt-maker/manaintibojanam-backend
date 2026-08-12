import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  canApplyConfirmedChange,
  createVoiceSession,
  initialConfirmationSnapshot,
  reduceConfirmation,
  triageVoiceUtterance,
} from '@bhojan/voice-core';
import {
  clearVoiceConfirmation,
  shouldHandleWithVoiceCorePreLlm,
  syncConfirmationFromPending,
} from '../src/features/voice/application/voiceCoreBridge.ts';

const root = join(import.meta.dirname, '..');

describe('OrderBhojan voice-core wiring', () => {
  it('exposes voice feature entrypoints', () => {
    const index = readFileSync(join(root, 'src/features/voice/index.ts'), 'utf8');
    const adapter = readFileSync(
      join(root, 'src/features/voice/adapters/orderBhojanVoiceAdapter.ts'),
      'utf8',
    );
    assert.match(index, /@bhojan\/voice-core/);
    assert.match(index, /runVoiceCoreTurn/);
    assert.match(index, /shouldHandleWithVoiceCorePreLlm/);
    assert.match(adapter, /createOrderBhojanVoiceAdapter/);
    assert.match(adapter, /userConfirmed: true/);
    assert.match(adapter, /applyConfirmedCartPlan/);
  });

  it('vite aliases @bhojan/voice-core', () => {
    const vite = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    assert.match(vite, /@bhojan\/voice-core/);
  });

  it('Phase 1.2 pre-LLM gate claims cart summary and stop', () => {
    assert.equal(shouldHandleWithVoiceCorePreLlm('what is in my cart'), true);
    assert.equal(shouldHandleWithVoiceCorePreLlm("what's in my cart"), true);
    assert.equal(shouldHandleWithVoiceCorePreLlm('stop'), true);
    assert.equal(shouldHandleWithVoiceCorePreLlm('add 1 masala dosa'), false);
    assert.equal(shouldHandleWithVoiceCorePreLlm('confirm'), false);
  });

  it('syncs confirmation snapshot from pending validation', () => {
    const awaiting = syncConfirmationFromPending({
      schemaVersion: '5.0',
      conversationId: 'c1',
      channel: 'web',
      status: 'validated',
      valid: true,
      clarificationQuestions: [],
      issues: [],
      proposedActions: [],
      executable: false,
      sideEffects: [],
      mutatedState: false,
    });
    assert.equal(awaiting.phase, 'awaiting_confirm');
    assert.equal(clearVoiceConfirmation().phase, 'none');
  });

  it('shared confirmation + triage contracts are importable', () => {
    const session = createVoiceSession({ product: 'orderbhojan', channel: 'web' });
    assert.equal(session.product, 'orderbhojan');

    let confirmation = reduceConfirmation(initialConfirmationSnapshot(), {
      type: 'SET_PENDING',
      pending: { planId: 'p1', status: 'validated', valid: true },
    });
    confirmation = reduceConfirmation(confirmation, {
      type: 'USER_UTTERANCE',
      message: 'confirm',
    });
    assert.equal(canApplyConfirmedChange(confirmation), true);

    const { decision } = triageVoiceUtterance({
      message: 'add 1 paneer butter masala',
      confirmation: initialConfirmationSnapshot(),
      task: { state: 'idle', clarificationCount: 0 },
    });
    assert.equal(decision.kind, 'propose_cart_add');
  });
});

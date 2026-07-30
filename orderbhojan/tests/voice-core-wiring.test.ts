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
    assert.match(adapter, /createOrderBhojanVoiceAdapter/);
    assert.match(adapter, /userConfirmed: true/);
    assert.match(adapter, /applyConfirmedCartPlan/);
  });

  it('vite aliases @bhojan/voice-core', () => {
    const vite = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    assert.match(vite, /@bhojan\/voice-core/);
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

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isFeatureEnabled, loadFeatureFlags } from '../src/featureFlags/flags.ts';
import {
  canUseVoiceCoreCartAdd,
  canUseVoiceCoreConfirmApply,
} from '../src/features/voice/application/voiceCoreConfirmAddParity.ts';
import type { CartPlanValidationResult } from '../src/features/assistant/domain/cartPlanContract.ts';

const root = join(import.meta.dirname, '..');

function validated(conversationId = 'c1'): CartPlanValidationResult {
  return {
    schemaVersion: '5.0',
    conversationId,
    channel: 'web',
    status: 'validated',
    valid: true,
    clarificationQuestions: [],
    issues: [],
    proposedActions: [],
    executable: false,
    sideEffects: [],
    mutatedState: false,
  };
}

describe('Phase 1.3b voice-core confirm/add parity', () => {
  it('keeps live confirm/add flag OFF by default (instant rollback)', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_VOICE_CORE_CONFIRM_ADD'), false);
  });

  it('blocks confirm apply when flag off or adapter not ready', () => {
    const pending = validated();
    assert.equal(
      canUseVoiceCoreConfirmApply({
        liveFlagEnabled: false,
        adapterReady: true,
        earlyRouteKind: 'apply_validated_confirm',
        pending,
        adapterPending: pending,
      }).ok,
      false,
    );
    assert.equal(
      canUseVoiceCoreConfirmApply({
        liveFlagEnabled: true,
        adapterReady: false,
        earlyRouteKind: 'apply_validated_confirm',
        pending,
        adapterPending: pending,
      }).ok,
      false,
    );
  });

  it('allows confirm apply only on parity-matched validated plans', () => {
    const pending = validated('c1');
    assert.equal(
      canUseVoiceCoreConfirmApply({
        liveFlagEnabled: true,
        adapterReady: true,
        earlyRouteKind: 'apply_validated_confirm',
        pending,
        adapterPending: validated('c1'),
      }).ok,
      true,
    );
    assert.equal(
      canUseVoiceCoreConfirmApply({
        liveFlagEnabled: true,
        adapterReady: true,
        earlyRouteKind: 'apply_validated_confirm',
        pending,
        adapterPending: validated('other'),
      }).ok,
      false,
    );
  });

  it('cart-add gate requires flag + readiness', () => {
    assert.equal(
      canUseVoiceCoreCartAdd({ liveFlagEnabled: true, adapterReady: true }).ok,
      true,
    );
    assert.equal(
      canUseVoiceCoreCartAdd({ liveFlagEnabled: false, adapterReady: true }).ok,
      false,
    );
  });

  it('send() still routes via decideVoiceCartTurn and keeps OB fallback', () => {
    const src = readFileSync(
      join(root, 'src/features/assistant/ui/useAssistantConversation.ts'),
      'utf8',
    );
    assert.match(src, /decideVoiceCartTurn/);
    assert.match(src, /canUseVoiceCoreConfirmApply/);
    assert.match(src, /applyConfirmedCartPlan/);
    assert.match(src, /FF_OB_AI_VOICE_CORE_CONFIRM_ADD|voiceCoreConfirmAddLive/);
    assert.match(src, /fall back to OB|OB cart-add|OB executor/i);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isFeatureEnabled, loadFeatureFlags } from '../src/featureFlags/flags.ts';

const root = join(import.meta.dirname, '..');

describe('Voice-core 1.3b rollback guards', () => {
  it('keeps live confirm/add flag OFF by default (instant rollback)', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_VOICE_CORE_CONFIRM_ADD'), false);
  });

  it('send() keeps the OB apply path and the cart-ready live flag', () => {
    const src = readFileSync(
      join(root, 'src/features/assistant/ui/useAssistantConversation.ts'),
      'utf8',
    );
    assert.match(src, /applyConfirmedCartPlan/);
    assert.match(src, /voiceCoreConfirmAddLive/);
  });
});

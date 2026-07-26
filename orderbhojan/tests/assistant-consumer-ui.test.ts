import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags';
import { applyConfirmedCartPlan } from '../src/features/cart/domain/applyConfirmedCartPlan';
import type { CartPlanValidationResult } from '../src/features/assistant/domain/cartPlanContract';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.resolve(__dirname, '../src/features/assistant/ui');

function readUi(relativePath: string): string {
  return readFileSync(path.join(uiRoot, relativePath), 'utf8');
}

function validatedPlan(overrides?: Partial<CartPlanValidationResult>): CartPlanValidationResult {
  return {
    schemaVersion: '4.0',
    conversationId: 'c1',
    channel: 'orderbhojan_web',
    status: 'validated',
    valid: true,
    clarificationQuestions: [],
    issues: [],
    proposedActions: [
      {
        type: 'cart_add_plan',
        requiresConfirmation: true,
        executable: false,
        payload: { itemId: 'dosa-1', name: 'Masala Dosa', price: 120, quantity: 1 },
      },
    ],
    executable: false,
    sideEffects: [],
    mutatedState: false,
    ...overrides,
  };
}

describe('assistant Phase 14 consumer UI', () => {
  it('keeps FF_OB_AI_ASSISTANT OFF by default', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_ASSISTANT'), false);
  });

  it('ConsumerAssistantEntry returns null when flag is OFF', () => {
    const entry = readUi('ConsumerAssistantEntry.tsx');
    assert.match(entry, /useAiAssistantFeature/);
    assert.match(entry, /if\s*\(\s*!enabled\s*\)\s*return\s*null/);
  });

  it('MarketplaceLayout mounts only the flag-gated entry', () => {
    const layout = readFileSync(
      path.resolve(__dirname, '../src/shared/layouts/MarketplaceLayout.tsx'),
      'utf8',
    );
    assert.match(layout, /ConsumerAssistantEntry/);
    assert.match(layout, /showAssistant/);
    assert.doesNotMatch(
      layout,
      /useVoiceOrderingTurn|usePostOrderAssist|runPostOrderAssist|useReorderFromTracking/,
    );
  });

  it('does not auto-apply cart plans on assist response', () => {
    const conversation = readUi('useAssistantConversation.ts');
    assert.match(conversation, /applyConfirmedCartPlan/);
    assert.match(conversation, /userConfirmed:\s*true/);
    // apply only inside confirmApplyPlan, not immediately after ask()
    const askBlock = conversation.slice(
      conversation.indexOf('const result = await ask'),
      conversation.indexOf('confirmApplyPlan'),
    );
    assert.doesNotMatch(askBlock, /applyConfirmedCartPlan/);
  });

  it('voice input reuses send() and never auto-applies or uses ordering-turn bypass', () => {
    const conversation = readUi('useAssistantConversation.ts');
    assert.match(conversation, /captureVoiceTranscript/);
    assert.match(conversation, /sendFromVoice/);
    assert.match(conversation, /startVoiceAgent/);
    assert.match(conversation, /correctTranscriptAgainstOrderingVocab/);
    assert.match(conversation, /await send\(corrected\)/);
    assert.match(conversation, /isValidatedCartConfirmMessage/);
    assert.doesNotMatch(conversation, /runVoiceOrderingTurn|askWithVoice/);
  });

  it('premium AI orb launcher is not a generic chat bubble', () => {
    const fab = readUi('ConsumerAssistantFab.tsx');
    assert.match(fab, /Voice Agent|waveform|tracking-\[0\.14em\]/);
    assert.doesNotMatch(fab, /MessageSquare/);
    assert.match(fab, /consumer-assistant-fab/);
  });

  it('mic button is dual-gated and click-to-speak only', () => {
    const sheet = readUi('ConsumerAssistantSheet.tsx');
    const shell = readUi('ConsumerAssistantShell.tsx');
    assert.match(sheet, /consumer-assistant-mic/);
    assert.match(sheet, /voiceEnabled && voiceAvailable/);
    assert.match(sheet, /Speak your question/);
    assert.match(sheet, /consumer-assistant-live-voice|Start live voice/);
    assert.match(shell, /onVoiceStart/);
    assert.match(shell, /sendFromVoice|startVoiceAgent/);
    assert.doesNotMatch(sheet, /continuous:\s*true|webkitSpeechRecognition/);
  });

  it('confirm bar requires validated status before enable', () => {
    const sheet = readUi('ConsumerAssistantSheet.tsx');
    assert.match(sheet, /Confirm & add to cart/);
    assert.match(sheet, /pendingValidation\?\.status === 'validated'/);
    assert.match(sheet, /Confirm stays disabled until the plan is validated/);
    assert.match(sheet, /consumer-assistant-clarifications/);
    assert.match(sheet, /clarificationQuestions/);
  });

  it('applyConfirmedCartPlan mutates only after userConfirmed and validated plan', () => {
    const adds: unknown[] = [];
    const result = applyConfirmedCartPlan({
      userConfirmed: true,
      validation: validatedPlan(),
      deps: {
        addItem: (line, qty) => {
          adds.push({ line, qty });
        },
        setQuantity: () => undefined,
      },
    });
    assert.equal(result.appliedCount, 1);
    assert.equal(result.mutatedState, true);
    assert.equal(adds.length, 1);

    const enriched = applyConfirmedCartPlan({
      userConfirmed: true,
      validation: validatedPlan({
        schemaVersion: '5.0',
        proposedActions: [
          {
            type: 'cart_add_plan',
            requiresConfirmation: true,
            executable: false,
            payload: {
              foodId: 'live_item',
              itemId: 'live_item',
              restaurantId: 'tenant_1',
              name: 'Paneer Tikka',
              unitPrice: 220,
              price: 220,
              quantity: 2,
            },
          },
        ],
      }),
      deps: {
        addItem: (line, qty) => {
          adds.push({ line, qty });
        },
        setQuantity: () => undefined,
      },
    });
    assert.equal(enriched.appliedCount, 1);
    assert.deepEqual(adds[1], {
      line: { foodId: 'live_item', name: 'Paneer Tikka', price: 220 },
      qty: 2,
    });

    const blocked = applyConfirmedCartPlan({
      userConfirmed: true,
      validation: validatedPlan({ status: 'invalid', valid: false }),
      deps: {
        addItem: () => {
          throw new Error('should not add');
        },
        setQuantity: () => undefined,
      },
    });
    assert.equal(blocked.appliedCount, 0);
    assert.equal(blocked.mutatedState, false);
  });

  it('assistant application layer still does not import cart store', () => {
    const files = [
      'application/runConsumerAssist.ts',
      'application/runValidateCartPlan.ts',
      'domain/readOnlyPolicy.ts',
      'hooks/useConsumerAssist.ts',
    ];
    for (const file of files) {
      const src = readFileSync(
        path.resolve(__dirname, '../src/features/assistant', file),
        'utf8',
      );
      assert.doesNotMatch(src, /cartStore|applyConfirmedCartPlan/);
    }
  });
});

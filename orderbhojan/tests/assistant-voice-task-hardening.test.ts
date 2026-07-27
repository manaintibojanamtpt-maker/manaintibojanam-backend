import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCartAddUserMessage } from '../src/features/assistant/domain/isCartAddUserMessage.ts';
import {
  resolveRestaurantSlugForApi,
  stripObrRestaurantPrefix,
  toPendingPlanRestaurantRef,
} from '../src/features/assistant/domain/restaurantIdSlug.ts';
import {
  shouldRetainPendingCartPlan,
  isExplicitNewOrderOrCancel,
  deriveTaskStateFromValidation,
} from '../src/features/assistant/domain/voiceOrderingTaskState.ts';
import {
  summarizePendingCartPlan,
  formatCartPlanSummarySpeech,
} from '../src/features/assistant/domain/summarizePendingCartPlan.ts';
import {
  decideVoiceCartTurn,
  simulateVoiceCartTurnSequence,
} from '../src/features/assistant/domain/decideVoiceCartTurn.ts';
import {
  isValidatedCartConfirmMessage,
  isConfirmCartUserMessage,
} from '../src/features/assistant/domain/isConfirmCartUserMessage.ts';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags.ts';
import type { CartPlanValidationResult } from '../src/features/assistant/domain/cartPlanContract.ts';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function mockValidation(
  status: CartPlanValidationResult['status'],
  overrides: Partial<CartPlanValidationResult> = {},
): CartPlanValidationResult {
  return {
    schemaVersion: '5.0',
    conversationId: 'c1',
    channel: 'orderbhojan_web',
    status,
    valid: status === 'validated',
    clarificationQuestions:
      status === 'needs_clarification'
        ? ['Which menu item should this cart change apply to?']
        : [],
    issues: [],
    proposedActions: [
      {
        type: 'cart_add_plan',
        requiresConfirmation: true,
        executable: false,
        payload: { name: 'Masala Dosa', quantity: 2, restaurantId: 'obr_mana-inti' },
      },
    ],
    executable: false,
    sideEffects: [],
    mutatedState: false,
    ...overrides,
  };
}

describe('voice task hardening — screenshot regressions', () => {
  it('parses “Add two quantity Masala Dosa from Inti bhojanam” to qty+dish+kitchen', () => {
    const parsed = parseCartAddUserMessage('Add two quantity Masala Dosa from Inti bhojanam');
    assert.ok(parsed);
    assert.equal(parsed!.quantity, 2);
    assert.match(parsed!.itemName, /masala dosa/i);
    assert.match(parsed!.kitchenHint ?? '', /inti bhojanam/i);
  });

  it('tolerates ASR typos feom/masla/intibojanam', () => {
    const parsed = parseCartAddUserMessage('add 2 quantity masla dosa feom inti bojanam');
    assert.ok(parsed);
    assert.equal(parsed!.quantity, 2);
    assert.match(parsed!.itemName, /masala dosa/i);
    assert.match(parsed!.kitchenHint ?? '', /inti bhojanam/i);
  });

  it('strips obr_ so slug APIs never receive marketplace IDs', () => {
    assert.equal(stripObrRestaurantPrefix('obr_mana-inti'), 'mana-inti');
    assert.equal(
      resolveRestaurantSlugForApi({ restaurantId: 'obr_mana-inti', restaurantSlug: 'obr_mana-inti' }),
      'mana-inti',
    );
    const ref = toPendingPlanRestaurantRef({
      planRestaurantId: 'obr_mana-inti',
      activeRestaurantId: 'other',
      activeRestaurantSlug: 'other-slug',
    });
    assert.equal(ref.restaurantId, 'obr_mana-inti');
    assert.equal(ref.restaurantSlug, 'mana-inti');
  });

  it('retains pending plan on Tomato Rice / confirm during clarification', () => {
    assert.equal(
      shouldRetainPendingCartPlan({
        pendingStatus: 'needs_clarification',
        userMessage: 'Tomato Rice',
      }),
      true,
    );
    assert.equal(
      shouldRetainPendingCartPlan({
        pendingStatus: 'needs_clarification',
        userMessage: 'confirm',
      }),
      true,
    );
    assert.equal(
      shouldRetainPendingCartPlan({
        pendingStatus: 'needs_clarification',
        userMessage: 'discard',
      }),
      false,
    );
    assert.equal(isExplicitNewOrderOrCancel('add idli from inti'), true);
  });

  it('blocks validate-gated confirm until status is validated', () => {
    const clarifying = mockValidation('needs_clarification');
    assert.equal(isConfirmCartUserMessage('confirm'), true);
    assert.equal(isValidatedCartConfirmMessage('confirm', clarifying), false);
    assert.equal(
      isValidatedCartConfirmMessage('confirm', mockValidation('validated')),
      true,
    );
  });

  it('confirm panel summary always includes dish + qty (+ kitchen when known)', () => {
    const lines = summarizePendingCartPlan(mockValidation('validated'), {
      kitchenName: 'Inti bhojanam',
    });
    assert.equal(lines.length, 1);
    assert.equal(lines[0]!.dish, 'Masala Dosa');
    assert.equal(lines[0]!.quantity, 2);
    assert.equal(lines[0]!.kitchen, 'Inti bhojanam');
    assert.match(formatCartPlanSummarySpeech(lines), /2× Masala Dosa from Inti bhojanam/);
    // Cold summary without display name still surfaces kitchen from restaurantId.
    const fromId = summarizePendingCartPlan(mockValidation('validated'));
    assert.equal(fromId[0]!.kitchen, 'mana-inti');
  });

  it('maps validation status to task states', () => {
    assert.equal(deriveTaskStateFromValidation('validated'), 'awaiting_confirm');
    assert.equal(deriveTaskStateFromValidation('needs_clarification'), 'needs_clarification');
    assert.equal(deriveTaskStateFromValidation(null), 'idle');
  });

  it('send() router: dish+kitchen add → cart_add_intent with qty 2', () => {
    const d = decideVoiceCartTurn({
      message: 'Add two quantity Masala Dosa from Inti bhojanam',
      pending: null,
    });
    assert.equal(d.kind, 'cart_add_intent');
    if (d.kind === 'cart_add_intent') {
      assert.equal(d.quantity, 2);
      assert.match(d.itemName, /masala dosa/i);
      assert.match(d.kitchenHint ?? '', /inti/i);
    }
  });

  it('send() router: Tomato Rice after clarify retains task + qty', () => {
    const pending = mockValidation('needs_clarification');
    const d = decideVoiceCartTurn({ message: 'Tomato Rice', pending });
    assert.equal(d.kind, 'clarify_dish');
    if (d.kind === 'clarify_dish') {
      assert.equal(d.dishName, 'Tomato Rice');
      assert.equal(d.quantity, 2);
      assert.equal(d.retainPending, true);
    }
  });

  it('send() router: confirm during clarification does not wipe pending', () => {
    const pending = mockValidation('needs_clarification');
    const seq = simulateVoiceCartTurnSequence(['confirm', 'Tomato Rice'], pending);
    assert.equal(seq.decisions[0]!.kind, 'confirm_while_clarifying');
    assert.equal(seq.decisions[0]!.retainPending, true);
    assert.equal(seq.decisions[1]!.kind, 'clarify_dish');
    assert.equal(seq.finalPendingRetained, true);
    assert.match(
      (seq.decisions[0] as { reply: string }).reply,
      /Working on:|Which menu item/i,
    );
  });

  it('send() router: confirm applies only when validated', () => {
    assert.equal(
      decideVoiceCartTurn({
        message: 'confirm',
        pending: mockValidation('validated'),
      }).kind,
      'apply_validated_confirm',
    );
    assert.notEqual(
      decideVoiceCartTurn({
        message: 'confirm',
        pending: mockValidation('needs_clarification'),
      }).kind,
      'apply_validated_confirm',
    );
  });

  it('send() router: Confirm Confirm applies validated plan (no generic chat)', () => {
    assert.equal(
      decideVoiceCartTurn({
        message: 'Confirm Confirm',
        pending: mockValidation('validated'),
      }).kind,
      'apply_validated_confirm',
    );
  });

  it('send() router: An Andhra Veg Thali clarifies pending dish', () => {
    const d = decideVoiceCartTurn({
      message: 'An Andhra Veg Thali',
      pending: mockValidation('needs_clarification'),
    });
    assert.equal(d.kind, 'clarify_dish');
    if (d.kind === 'clarify_dish') {
      assert.equal(d.dishName, 'Andhra Veg Thali');
    }
  });

  it('send() router: bare dish name starts cart_add_intent when idle', () => {
    const d = decideVoiceCartTurn({
      message: 'Andhra Veg Thali',
      pending: null,
    });
    assert.equal(d.kind, 'cart_add_intent');
    if (d.kind === 'cart_add_intent') {
      assert.equal(d.itemName, 'Andhra Veg Thali');
      assert.equal(d.quantity, 1);
    }
  });

  it('wires decideVoiceCartTurn + prefetch + obr_ slug into conversation send()', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../src/features/assistant/ui/useAssistantConversation.ts'),
      'utf8',
    );
    assert.match(src, /decideVoiceCartTurn/);
    assert.match(src, /prefetchKitchenMenuForAssist/);
    assert.match(src, /toPendingPlanRestaurantRef/);
    assert.match(src, /captureNativeAndroidStt/);
    assert.match(src, /voiceAbortRef\.current\?\.abort\(\)/);
  });

  it('keeps native Android STT flag OFF by default', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_NATIVE_STT'), false);
  });
});

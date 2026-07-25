import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAiAuditEvent,
  redactMessagePreview,
} from '../auditContracts.js';
import {
  classifyIntentHeuristic,
  isIntentAllowedForMode,
} from '../intentTaxonomy.js';
import {
  applyClaimedSideEffectGuard,
  evaluateAssistSafety,
} from '../safetyGuardrails.js';
import {
  normalizeProposedAction,
  parseStructuredAssistOutput,
} from '../structuredOutput.js';

describe('intentTaxonomy', () => {
  it('keeps consumer and marketing intents separated', () => {
    assert.equal(isIntentAllowedForMode('consumer_ordering', 'search_menu'), true);
    assert.equal(isIntentAllowedForMode('consumer_ordering', 'lead_qualify'), false);
    assert.equal(isIntentAllowedForMode('merchant_marketing', 'lead_qualify'), true);
    assert.equal(isIntentAllowedForMode('merchant_marketing', 'cart_question'), false);
  });

  it('classifies common messages heuristically', () => {
    assert.equal(classifyIntentHeuristic('consumer_ordering', 'show biryani near me'), 'search_menu');
    assert.equal(classifyIntentHeuristic('merchant_marketing', 'what is the pricing?'), 'pricing_help');
    assert.equal(classifyIntentHeuristic('merchant_marketing', 'add to cart'), 'out_of_scope');
  });
});

describe('structuredOutput', () => {
  it('parses model JSON into schema 2.0', () => {
    const parsed = parseStructuredAssistOutput({
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      message: 'recommend dinner',
      modelText: JSON.stringify({
        intent: 'recommend_meals',
        reply: 'Try a mild thali.',
        confidence: 0.9,
        proposedActions: [{ type: 'none', requiresConfirmation: false }],
        safety: { blocked: false, reasons: [] },
      }),
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.source, 'model_json');
    assert.equal(parsed.value.intent, 'recommend_meals');
    assert.equal(parsed.value.proposedActions[0]?.executable, false);
  });

  it('wraps freeform text with heuristic intent', () => {
    const parsed = parseStructuredAssistOutput({
      mode: 'consumer_ordering',
      channel: 'orderbhojan_android',
      message: 'track my order',
      modelText: 'You can open Orders to see live tracking.',
    });
    assert.equal(parsed.source, 'heuristic_wrap');
    assert.equal(parsed.value.intent, 'order_status_help');
  });

  it('forces proposed actions non-executable', () => {
    const action = normalizeProposedAction({
      type: 'cart_add_plan',
      executable: true,
      requiresConfirmation: false,
      payload: { itemId: 'x' },
    });
    assert.ok(action);
    assert.equal(action.executable, false);
    assert.equal(action.requiresConfirmation, true);
  });
});

describe('safetyGuardrails', () => {
  it('retains non-executable cart plans for read-only consumer mode (confirm-to-apply)', () => {
    const structured = parseStructuredAssistOutput({
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      message: 'add dosa to cart',
      modelText: JSON.stringify({
        intent: 'cart_question',
        reply: 'I can help you find dosa on the menu.',
        proposedActions: [
          { type: 'cart_add_plan', payload: { itemId: 'dosa-1' } },
          { type: 'navigate', payload: { path: '/search' } },
        ],
        safety: { blocked: false, reasons: [] },
      }),
    }).value;

    const evaluation = evaluateAssistSafety(structured, {
      allowMutationPlans: false,
      readOnlyConsumer: true,
    });
    const plan = evaluation.sanitized.proposedActions.find((a) => a.type === 'cart_add_plan');
    assert.ok(plan);
    assert.equal(plan.executable, false);
    assert.equal(plan.requiresConfirmation, true);
    assert.equal(
      evaluation.sanitized.proposedActions.some((a) => a.type === 'navigate'),
      true,
    );
  });

  it('blocks place_order and marketing cart actions', () => {
    const base = parseStructuredAssistOutput({
      mode: 'merchant_marketing',
      channel: 'bhojanos_marketing',
      message: 'add item to cart',
      modelText: JSON.stringify({
        intent: 'product_faq',
        reply: 'BhojanOS helps kitchens take direct orders.',
        proposedActions: [{ type: 'cart_add_plan', payload: { itemId: '1' } }],
        safety: { blocked: false, reasons: [] },
      }),
    }).value;

    const evaluation = evaluateAssistSafety(base);
    assert.equal(
      evaluation.violations.some((v) => v.code === 'CROSS_MODE_ACTION'),
      true,
    );
  });

  it('flags claimed side effects in reply text', () => {
    const structured = parseStructuredAssistOutput({
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      message: 'add dosa',
      modelText: JSON.stringify({
        intent: 'cart_question',
        reply: 'Added to your cart successfully.',
        proposedActions: [{ type: 'none' }],
        safety: { blocked: false, reasons: [] },
      }),
    }).value;

    const evaluation = applyClaimedSideEffectGuard(evaluateAssistSafety(structured));
    assert.equal(evaluation.allowed, false);
    assert.equal(
      evaluation.violations.some((v) => v.code === 'CLAIMED_SIDE_EFFECT'),
      true,
    );
    assert.match(evaluation.sanitized.reply, /No cart or order changes were applied/i);
  });
});

describe('auditContracts', () => {
  it('redacts emails phones and secret-like tokens', () => {
    const preview = redactMessagePreview('mail me at owner@kitchen.com or +91 98765 43210 sk-abcdef1234567890');
    assert.match(preview, /\[redacted-email\]/);
    assert.match(preview, /\[redacted-phone\]/);
    assert.match(preview, /\[redacted-secret\]/);
  });

  it('builds phase-2 audit events with mutatedState false', () => {
    const event = buildAiAuditEvent({
      eventType: 'ai.assist.response',
      correlationId: 'c1',
      conversationId: 'v1',
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      intent: 'general_help',
      success: true,
    });
    assert.equal(event.schemaVersion, '21.0');
    assert.equal(event.phase, 3); // assist events default to phase 3 after consumer read-only
    assert.equal(event.mutatedState, false);
    assert.equal(event.platform, 'web');
  });
});

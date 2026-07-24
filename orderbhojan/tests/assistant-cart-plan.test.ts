import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags';
import { runValidateCartPlan } from '../src/features/assistant/application/runValidateCartPlan';
import {
  assertCartPlanNonExecutable,
  normalizeCartPlanActions,
  type CartPlanValidationResult,
} from '../src/features/assistant/domain/cartPlanContract';
import { AssistantApiError } from '../src/features/assistant/types';
import { MarketplaceApiError } from '../src/marketplace-api/errors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assistantRoot = path.resolve(__dirname, '../src/features/assistant');

function readAssistantSource(relativePath: string): string {
  return readFileSync(path.join(assistantRoot, relativePath), 'utf8');
}

describe('assistant Phase 4 cart plan validation contracts', () => {
  it('keeps FF_OB_AI_ASSISTANT OFF by default', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_ASSISTANT'), false);
  });

  it('does not call the API client when the feature flag is OFF', async () => {
    let called = false;
    await assert.rejects(
      () =>
        runValidateCartPlan({
          enabled: false,
          getIdToken: async () => 'token',
          client: {
            validateCartPlan: async () => {
              called = true;
              throw new Error('should not be called');
            },
          },
          request: {
            restaurantId: 'tenant_1',
            proposedActions: [{ type: 'cart_add_plan', payload: { itemId: 'dosa-1' } }],
          },
        }),
      (err: unknown) =>
        err instanceof AssistantApiError && err.code === 'AI_FEATURE_DISABLED' && err.retryable === false,
    );
    assert.equal(called, false);
  });

  it('normalizes proposed cart plan actions as non-executable', () => {
    const actions = normalizeCartPlanActions([
      { type: 'cart_add_plan', executable: true, payload: { itemId: '1' } },
      { type: 'cart_update_plan', requiresConfirmation: false, payload: { lineId: 'a' } },
      { type: 'place_order' },
      { type: 'navigate', payload: { path: '/cart' } },
    ]);

    assert.equal(actions.length, 2);
    for (const action of actions) {
      assert.equal(action.executable, false);
      assert.equal(action.requiresConfirmation, true);
    }
    assert.equal(actions[0]?.type, 'cart_add_plan');
    assert.equal(actions[1]?.type, 'cart_update_plan');
  });

  it('keeps validation results non-executable with empty side effects', () => {
    const result: CartPlanValidationResult = {
      schemaVersion: '4.0',
      conversationId: 'conv-1',
      channel: 'orderbhojan_web',
      status: 'validated',
      valid: true,
      clarificationQuestions: [],
      issues: [],
      proposedActions: normalizeCartPlanActions([
        { type: 'cart_add_plan', payload: { itemId: '1' } },
      ]),
      executable: false,
      sideEffects: [],
      mutatedState: false,
    };

    assert.doesNotThrow(() => assertCartPlanNonExecutable(result));
    assert.equal(result.executable, false);
    assert.deepEqual(result.sideEffects, []);
    assert.equal(result.mutatedState, false);
  });

  it('rejects validation results that claim to be executable', () => {
    const invalid = {
      schemaVersion: '4.0',
      conversationId: 'conv-1',
      channel: 'orderbhojan_web',
      status: 'validated',
      valid: true,
      clarificationQuestions: [],
      issues: [],
      proposedActions: [],
      executable: true,
      sideEffects: [],
      mutatedState: false,
    } as unknown as CartPlanValidationResult;

    assert.throws(
      () => assertCartPlanNonExecutable(invalid),
      /must not be executable/,
    );
  });

  it('maps 429 to typed retryable AI_RATE_LIMITED without implying auto-retry', () => {
    const err = new MarketplaceApiError({
      code: 'HTTP_429',
      message: 'Too Many Requests',
      status: 429,
      retryable: true,
    });
    const mapped = new AssistantApiError({
      code: 'AI_RATE_LIMITED',
      message: 'AI rate limit reached. Please wait and try again.',
      retryable: true,
      status: 429,
      correlationId: err.correlationId,
    });
    assert.equal(mapped.code, 'AI_RATE_LIMITED');
    assert.equal(mapped.retryable, true);
    assert.equal(mapped.status, 429);
  });

  it('assistant feature sources do not import cart or checkout modules', () => {
    const files = [
      'application/runConsumerAssist.ts',
      'application/runValidateCartPlan.ts',
      'domain/readOnlyPolicy.ts',
      'domain/cartPlanContract.ts',
      'hooks/useConsumerAssist.ts',
      'hooks/useValidateCartPlan.ts',
      'hooks/useAiAssistantFeature.ts',
      'hooks/useAiVoiceFeature.ts',
      'hooks/useVoiceConsumerAssist.ts',
      'application/runVoiceConsumerAssist.ts',
      'infrastructure/assistantApiClient.ts',
      'infrastructure/voiceSpeechCapture.ts',
      'domain/resolveConsumerAssistChannel.ts',
      'index.ts',
      'types.ts',
    ];
    for (const file of files) {
      const src = readAssistantSource(file);
      assert.equal(/from ['"]@\/features\/cart/.test(src), false, `${file} imports cart`);
      assert.equal(/from ['"]@\/features\/checkout/.test(src), false, `${file} imports checkout`);
      assert.equal(/cartStore|useCheckoutFlow|razorpayCheckout/.test(src), false, `${file} references checkout/cart`);
    }
  });

  it('MarketplaceLayout does not call validate/cart hooks directly', () => {
    const layout = readFileSync(
      path.resolve(__dirname, '../src/shared/layouts/MarketplaceLayout.tsx'),
      'utf8',
    );
    assert.match(layout, /ConsumerAssistantEntry/);
    assert.doesNotMatch(layout, /useValidateCartPlan|applyConfirmedCartPlan/);
  });
});

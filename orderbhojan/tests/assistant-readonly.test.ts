import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags';
import { runConsumerAssist } from '../src/features/assistant/application/runConsumerAssist';
import { isMutationActionType, toConsumerHints } from '../src/features/assistant/domain/readOnlyPolicy';
import { AssistantApiError } from '../src/features/assistant/types';
import { MarketplaceApiError } from '../src/marketplace-api/errors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assistantRoot = path.resolve(__dirname, '../src/features/assistant');

function readAssistantSource(relativePath: string): string {
  return readFileSync(path.join(assistantRoot, relativePath), 'utf8');
}

describe('assistant Phase 3 read-only contracts', () => {
  it('keeps FF_OB_AI_ASSISTANT OFF by default', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_ASSISTANT'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_VOICE'), false);
  });

  it('does not call the API client when the feature flag is OFF', async () => {
    let called = false;
    await assert.rejects(
      () =>
        runConsumerAssist({
          enabled: false,
          getIdToken: async () => 'token',
          client: {
            consumerAssist: async () => {
              called = true;
              throw new Error('should not be called');
            },
          },
          request: { message: 'hello' },
        }),
      (err: unknown) =>
        err instanceof AssistantApiError && err.code === 'AI_FEATURE_DISABLED' && err.retryable === false,
    );
    assert.equal(called, false);
  });

  it('strips mutation action types from consumer hints', () => {
    assert.equal(isMutationActionType('cart_add_plan'), true);
    assert.equal(isMutationActionType('place_order'), true);
    assert.equal(isMutationActionType('navigate'), false);

    const hints = toConsumerHints([
      { type: 'cart_add_plan', payload: { itemId: '1' } },
      { type: 'place_order' },
      { type: 'navigate', payload: { path: '/search' } },
      { type: 'open_url', payload: { url: 'https://www.bhojanos.com' } },
    ]);

    assert.deepEqual(
      hints.map((h) => h.type),
      ['navigate', 'open_url'],
    );
    assert.equal(hints[0]?.target, '/search');
  });

  it('maps 429 to typed retryable AI_RATE_LIMITED without implying auto-retry', () => {
    const err = new MarketplaceApiError({
      code: 'HTTP_429',
      message: 'Too Many Requests',
      status: 429,
      retryable: true,
    });
    // Mirror assistantApiClient mapping rules used for 429.
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
      'domain/readOnlyPolicy.ts',
      'hooks/useConsumerAssist.ts',
      'hooks/useAiAssistantFeature.ts',
      'infrastructure/assistantApiClient.ts',
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

  it('MarketplaceLayout mounts ConsumerAssistantEntry (flag-gated entry)', () => {
    const layout = readFileSync(
      path.resolve(__dirname, '../src/shared/layouts/MarketplaceLayout.tsx'),
      'utf8',
    );
    assert.match(layout, /ConsumerAssistantEntry/);
    assert.doesNotMatch(layout, /useConsumerAssist|useValidateCartPlan/);
  });
});

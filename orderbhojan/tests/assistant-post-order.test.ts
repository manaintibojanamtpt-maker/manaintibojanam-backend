import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags';
import { runPostOrderAssist } from '../src/features/assistant/application/runPostOrderAssist';
import { buildPostOrderContext } from '../src/features/assistant/domain/postOrderAssistContract';
import { toPostOrderHints } from '../src/features/assistant/domain/postOrderPolicy';
import { AssistantApiError } from '../src/features/assistant/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assistantRoot = path.resolve(__dirname, '../src/features/assistant');

function readAssistantSource(relativePath: string): string {
  return readFileSync(path.join(assistantRoot, relativePath), 'utf8');
}

describe('assistant Phase 10 post-order read-only contracts', () => {
  it('keeps FF_OB_AI_POST_ORDER OFF by default', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_ASSISTANT'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_POST_ORDER'), false);
  });

  it('does not call the API when either flag is OFF', async () => {
    let called = false;
    const client = {
      postOrderAssist: async () => {
        called = true;
        throw new Error('should not be called');
      },
    };

    await assert.rejects(
      () =>
        runPostOrderAssist({
          assistantEnabled: true,
          postOrderEnabled: false,
          getIdToken: async () => 'token',
          client,
          request: { message: 'Where is my order?' },
        }),
      (err: unknown) => err instanceof AssistantApiError && err.code === 'AI_FEATURE_DISABLED',
    );

    await assert.rejects(
      () =>
        runPostOrderAssist({
          assistantEnabled: false,
          postOrderEnabled: true,
          getIdToken: async () => 'token',
          client,
          request: { message: 'Where is my order?' },
        }),
      (err: unknown) => err instanceof AssistantApiError && err.code === 'AI_FEATURE_DISABLED',
    );

    assert.equal(called, false);
  });

  it('maps enabled assist through with orderContextUsed and empty sideEffects', async () => {
    const result = await runPostOrderAssist({
      assistantEnabled: true,
      postOrderEnabled: true,
      getIdToken: async () => 'token',
      client: {
        postOrderAssist: async (req) => ({
          schemaVersion: '10.0',
          conversationId: 'c1',
          channel: 'orderbhojan_web',
          reply: 'Your order is preparing.',
          intent: 'order_status_help',
          orderContextUsed: Boolean(req.orderContext?.orderId),
          safetyBlocked: false,
          suggestedHints: [{ type: 'navigate', target: '/orders/ord_1/track' }],
          sideEffects: [],
          mutatedState: false,
        }),
      },
      request: {
        message: 'Track my order',
        orderContext: buildPostOrderContext({
          orderId: 'ord_1',
          snapshot: { status: 'preparing' },
        }),
      },
    });

    assert.equal(result.schemaVersion, '10.0');
    assert.equal(result.orderContextUsed, true);
    assert.deepEqual(result.sideEffects, []);
    assert.equal(result.mutatedState, false);
  });

  it('keeps only /orders navigate hints and strips mutations', () => {
    const hints = toPostOrderHints([
      { type: 'place_order' },
      { type: 'reorder' },
      { type: 'navigate', payload: { path: '/checkout' } },
      { type: 'navigate', payload: { path: '/orders' } },
      { type: 'navigate', payload: { path: '/orders/abc/track' } },
      { type: 'open_url', payload: { url: 'https://evil.example' } },
    ]);

    assert.deepEqual(
      hints.map((h) => h.target ?? h.type),
      ['/orders', '/orders/abc/track'],
    );
  });

  it('post-order sources do not import cart, checkout, or marketplace order fetchers', () => {
    const files = [
      'application/runPostOrderAssist.ts',
      'domain/postOrderAssistContract.ts',
      'domain/postOrderPolicy.ts',
      'hooks/usePostOrderAssist.ts',
      'hooks/useAiPostOrderFeature.ts',
    ];
    for (const file of files) {
      const src = readAssistantSource(file);
      assert.equal(/from ['"]@\/features\/cart/.test(src), false, `${file} imports cart`);
      assert.equal(/from ['"]@\/features\/checkout/.test(src), false, `${file} imports checkout`);
      assert.equal(/getMarketplaceApiClient|listOrders|getTracking|submitOrderFeedback/.test(src), false, `${file} fetches orders`);
      assert.equal(/useReorderFromTracking|razorpayCheckout/.test(src), false, `${file} mutates`);
    }
  });

  it('Phase 10 hooks remain separate from layout networking (Phase 17 mounts via flag only)', () => {
    const layout = readFileSync(
      path.resolve(__dirname, '../src/shared/layouts/MarketplaceLayout.tsx'),
      'utf8',
    );
    // Layout may gate track-route Entry with useAiPostOrderFeature — must not call assist APIs.
    assert.equal(/usePostOrderAssist|runPostOrderAssist/i.test(layout), false);
  });
});

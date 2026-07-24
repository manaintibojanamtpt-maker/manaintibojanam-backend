import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { runMarketingAssist } from '../application/runMarketingAssist';
import {
  isForbiddenMarketingActionType,
  toMarketingHints,
} from '../domain/readOnlyPolicy';
import { resolveMarketingAssistChannel } from '../domain/resolveMarketingAssistChannel';
import { AssistantApiError } from '../types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assistantRoot = resolve(__dirname, '..');
const repoRoot = resolve(__dirname, '../../../..');

function readAssistantSource(relativePath: string): string {
  return readFileSync(join(assistantRoot, relativePath), 'utf8');
}

describe('assistant Phase 7 marketing read-only contracts', () => {
  it('keeps aiMarketingAssistant OFF by default in feature registry', () => {
    const features = readFileSync(join(repoRoot, 'src/config/features.ts'), 'utf8');
    assert.match(features, /aiMarketingAssistant:\s*false/);
    const envExample = readFileSync(join(repoRoot, '.env.example'), 'utf8');
    assert.match(envExample, /VITE_FF_AI_MARKETING_ASSISTANT/);
  });

  it('resolves the locked marketing channel', () => {
    assert.equal(resolveMarketingAssistChannel(), 'bhojanos_marketing');
  });

  it('does not call the API client when the feature flag is OFF', async () => {
    let called = false;
    await assert.rejects(
      () =>
        runMarketingAssist({
          enabled: false,
          client: {
            marketingAssist: async () => {
              called = true;
              throw new Error('should not be called');
            },
          },
          request: { message: 'How do I sign up?' },
        }),
      (err: unknown) =>
        err instanceof AssistantApiError &&
        err.code === 'AI_FEATURE_DISABLED' &&
        err.retryable === false,
    );
    assert.equal(called, false);
  });

  it('maps allowed marketing hints and strips consumer/cart actions', () => {
    assert.equal(isForbiddenMarketingActionType('cart_add_plan'), true);
    assert.equal(isForbiddenMarketingActionType('place_order'), true);
    assert.equal(isForbiddenMarketingActionType('suggest_signup'), false);

    const hints = toMarketingHints([
      { type: 'cart_add_plan', payload: { itemId: '1' } },
      { type: 'place_order' },
      { type: 'suggest_signup', payload: { path: '/onboard' } },
      { type: 'suggest_demo' },
      { type: 'open_url', payload: { url: 'https://www.bhojanos.com/pricing' } },
      { type: 'navigate', payload: { path: '/contact' } },
    ]);

    assert.deepEqual(
      hints.map((h) => h.type),
      ['suggest_signup', 'suggest_demo', 'open_url', 'navigate'],
    );
    assert.equal(hints[0]?.target, '/onboard');
    assert.equal(hints[2]?.target, 'https://www.bhojanos.com/pricing');
  });

  it('maps enabled assist through and keeps sideEffects empty', async () => {
    const result = await runMarketingAssist({
      enabled: true,
      client: {
        marketingAssist: async () => ({
          schemaVersion: '7.0',
          conversationId: 'c1',
          channel: 'bhojanos_marketing',
          reply: 'You can start onboarding at /onboard.',
          intent: 'onboarding_help',
          safetyBlocked: false,
          suggestedHints: [{ type: 'suggest_signup', target: '/onboard' }],
          sideEffects: [],
          mutatedState: false,
        }),
      },
      request: { message: 'How do I start?' },
    });

    assert.equal(result.schemaVersion, '7.0');
    assert.equal(result.channel, 'bhojanos_marketing');
    assert.deepEqual(result.sideEffects, []);
    assert.equal(result.mutatedState, false);
  });

  it('assistant feature sources do not import cart, checkout, or owner mutations', () => {
    const files = [
      'application/runMarketingAssist.ts',
      'domain/readOnlyPolicy.ts',
      'hooks/useMarketingAssist.ts',
      'hooks/useAiMarketingAssistantFeature.ts',
      'infrastructure/assistantApiClient.ts',
      'index.ts',
      'types.ts',
    ];
    for (const file of files) {
      const src = readAssistantSource(file);
      assert.equal(/from ['"].*cart/.test(src), false, `${file} imports cart`);
      assert.equal(/from ['"].*checkout/.test(src), false, `${file} imports checkout`);
      assert.equal(/razorpay|placeOrder|cartStore/i.test(src), false, `${file} references checkout/cart`);
      assert.equal(/\/api\/ai\/chat/.test(src), false, `${file} uses legacy ai/chat`);
    }
  });

  it('Phase 7 contracts stay free of UI auto-execution and cart imports', () => {
    const runner = readAssistantSource('application/runMarketingAssist.ts');
    assert.doesNotMatch(runner, /applyMarketingHint|navigate\(/);
  });

  it('HTTP client uses zero-retry assist path (no retry loop)', () => {
    const client = readAssistantSource('infrastructure/assistantApiClient.ts');
    assert.match(client, /\/api\/ai\/v1\/assist/);
    assert.match(client, /merchant_marketing/);
    assert.equal(/retryAttempts|for\s*\(.*retry|while\s*\(.*retry/i.test(client), false);
  });
});

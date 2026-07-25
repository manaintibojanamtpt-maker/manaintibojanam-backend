import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAiGatewayReady, readAiGatewayConfig } from '../aiGatewayConfig.js';
import {
  assertModeChannelPolicy,
  getAllowedCapabilities,
  isAssistantMode,
  resolveAssistantChannel,
} from '../assistantModeRouter.js';
import { openRouterChatCompletion, OpenRouterClientError } from '../openRouterClient.js';

describe('aiGatewayConfig', () => {
  it('defaults gateway OFF even when OpenRouter key is present', () => {
    const config = readAiGatewayConfig({
      OPENROUTER_API_KEY: 'sk-test',
      OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
      OPENROUTER_MODEL: 'openai/gpt-4o-mini',
    });
    assert.equal(config.enabled, false);
    assert.equal(isAiGatewayReady(config), false);
    assert.equal(config.model, 'openai/gpt-4o-mini');
  });

  it('defaults to a stable paid model when OPENROUTER_MODEL is unset', () => {
    const config = readAiGatewayConfig({
      OPENROUTER_API_KEY: 'sk-test',
    });
    assert.equal(config.model, 'openai/gpt-4o-mini');
    assert.doesNotMatch(config.model, /:free$/);
  });

  it('is ready only when explicitly enabled and key exists', () => {
    const config = readAiGatewayConfig({
      AI_GATEWAY_ENABLED: 'true',
      OPENROUTER_API_KEY: 'sk-test',
    });
    assert.equal(config.enabled, true);
    assert.equal(isAiGatewayReady(config), true);
  });
});

describe('assistantModeRouter', () => {
  it('separates consumer and marketing capabilities', () => {
    const consumer = getAllowedCapabilities('consumer_ordering');
    const marketing = getAllowedCapabilities('merchant_marketing');
    assert.ok(consumer.includes('browse_restaurants'));
    assert.ok(!consumer.includes('lead_qualification'));
    assert.ok(marketing.includes('lead_qualification'));
    assert.ok(!marketing.includes('cart_plan_readonly'));
  });

  it('blocks cross-mode channels', () => {
    assert.equal(assertModeChannelPolicy('consumer_ordering', 'bhojanos_marketing').ok, false);
    assert.equal(assertModeChannelPolicy('merchant_marketing', 'orderbhojan_web').ok, false);
    assert.equal(assertModeChannelPolicy('consumer_ordering', 'orderbhojan_android').ok, true);
    assert.equal(assertModeChannelPolicy('merchant_marketing', 'bhojanos_marketing').ok, true);
  });

  it('parses mode and channel', () => {
    assert.equal(isAssistantMode('consumer_ordering'), true);
    assert.equal(isAssistantMode('admin'), false);
    assert.equal(resolveAssistantChannel('orderbhojan_web'), 'orderbhojan_web');
    assert.equal(resolveAssistantChannel('nope'), 'unknown');
  });
});

describe('openRouterClient', () => {
  it('posts chat completions to OpenRouter without exposing the key in errors', async () => {
    const calls: Array<{ url: string; auth?: string }> = [];
    const result = await openRouterChatCompletion({
      config: {
        enabled: true,
        apiKey: 'sk-secret',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'openai/gpt-oss-20b:free',
        timeoutMs: 5_000,
        maxTokens: 128,
        rateLimitMax: 60,
        httpReferer: 'https://www.bhojanos.com',
        appTitle: 'BhojanOS AI Platform',
      },
      messages: [
        { role: 'system', content: 'test' },
        { role: 'user', content: 'hello' },
      ],
      fetchImpl: async (url, init) => {
        calls.push({
          url: String(url),
          auth: (init?.headers as Record<string, string>)?.Authorization,
        });
        return new Response(
          JSON.stringify({
            id: 'gen-1',
            model: 'openai/gpt-oss-20b:free',
            choices: [{ message: { content: 'Hi from OpenRouter stub' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    assert.equal(result.text, 'Hi from OpenRouter stub');
    assert.equal(calls[0]?.url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(calls[0]?.auth, 'Bearer sk-secret');
  });

  it('throws when API key missing', async () => {
    await assert.rejects(
      () =>
        openRouterChatCompletion({
          config: {
            enabled: true,
            apiKey: null,
            baseUrl: 'https://openrouter.ai/api/v1',
            model: 'openai/gpt-oss-20b:free',
            timeoutMs: 5_000,
            maxTokens: 128,
            rateLimitMax: 60,
            httpReferer: 'https://www.bhojanos.com',
            appTitle: 'BhojanOS AI Platform',
          },
          messages: [{ role: 'user', content: 'x' }],
        }),
      (err: unknown) => err instanceof OpenRouterClientError && err.code === 'AI_GATEWAY_NOT_CONFIGURED',
    );
  });
});

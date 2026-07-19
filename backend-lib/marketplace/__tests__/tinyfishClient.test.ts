import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSearchTermsFromTinyFishResponse,
  fetchTinyFishQueryTerms,
  resetTinyFishQueryExpansionCacheForTests,
} from '../search/tinyfishClient.js';
import { readTinyFishSearchConfig } from '../search/tinyfishConfig.js';

describe('tinyfishClient', () => {
  beforeEach(() => {
    resetTinyFishQueryExpansionCacheForTests();
  });

  it('extracts dish terms from TinyFish response titles and snippets', () => {
    const terms = extractSearchTermsFromTinyFishResponse('biryani', {
      results: [
        { title: 'Hyderabadi Chicken Biryani recipe', snippet: 'Popular biryani dish served with raita' },
      ],
    });
    assert.ok(terms.includes('biryani'));
    assert.ok(terms.some((term) => term.includes('hyderabadi')));
  });

  it('returns original query when TinyFish is not configured', async () => {
    const terms = await fetchTinyFishQueryTerms('paneer', {
      config: null,
    });
    assert.deepEqual(terms, ['paneer']);
  });

  it('calls TinyFish search API when configured', async () => {
    const calls: string[] = [];
    const terms = await fetchTinyFishQueryTerms('dosa', {
      config: {
        apiKey: 'test-key',
        enabled: true,
        location: 'IN',
        language: 'en',
        timeoutMs: 500,
        cacheTtlMs: 60_000,
      },
      fetchImpl: async (url, init) => {
        calls.push(String(url));
        assert.equal((init?.headers as Record<string, string>)['X-API-Key'], 'test-key');
        return new Response(
          JSON.stringify({
            results: [{ title: 'Masala Dosa', snippet: 'Crispy South Indian dosa' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    assert.equal(calls.length, 1);
    assert.match(calls[0]!, /api\.search\.tinyfish\.ai/);
    assert.ok(terms.some((term) => term.includes('dosa')));
  });

  it('reads API key from TINYFISH_API_KEY or TINYFISH_SEARCH_API_KEY', () => {
    assert.equal(readTinyFishSearchConfig({ TINYFISH_API_KEY: ' primary ' })?.apiKey, 'primary');
    assert.equal(readTinyFishSearchConfig({ TINYFISH_SEARCH_API_KEY: 'fallback' })?.apiKey, 'fallback');
  });
});

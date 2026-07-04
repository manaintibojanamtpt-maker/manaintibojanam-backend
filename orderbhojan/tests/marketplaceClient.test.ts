import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MarketplaceHttpClient } from '../src/marketplace-api/client';
import { isApiSuccess } from '../src/marketplace-api/errors';
import type { MarketplaceHealth } from '../src/types/marketplace';

describe('MarketplaceHttpClient', () => {
  it('parses successful API envelope and attaches correlation id', async () => {
    const fetchMock = mock.fn(async () =>
      Response.json({
        ok: true,
        value: { status: 'ok', version: '1.0.0-m0', environment: 'test' },
        meta: { correlationId: 'test-correlation' },
      }, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new MarketplaceHttpClient({
      baseUrl: 'http://localhost:5174',
      apiVersion: '1.0',
      timeoutMs: 5000,
      retryAttempts: 0,
      retryDelayMs: 100,
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      const result = await client.request<MarketplaceHealth>({
        path: '/api/marketplace/health',
        correlationId: 'client-correlation',
      });
      assert.equal(result.status, 'ok');
      assert.equal(fetchMock.mock.calls.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('maps API failure envelope to MarketplaceApiError', async () => {
    const fetchMock = mock.fn(async () =>
      Response.json(
        {
          ok: false,
          error: { code: 'RESTAURANT_NOT_LIVE', message: 'Not live', retryable: false },
        },
        { status: 403, headers: { 'content-type': 'application/json' } },
      ),
    );

    const client = new MarketplaceHttpClient({
      baseUrl: 'http://localhost:5174',
      apiVersion: '1.0',
      timeoutMs: 5000,
      retryAttempts: 0,
      retryDelayMs: 100,
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      await assert.rejects(
        () => client.request({ path: '/api/marketplace/discover' }),
        (error: Error) => {
          assert.match(error.message, /Not live/);
          return true;
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('marketplace api envelope helpers', () => {
  it('detects success envelope', () => {
    assert.equal(
      isApiSuccess({ ok: true, value: { status: 'ok', version: '1', environment: 'test' } }),
      true,
    );
  });
});

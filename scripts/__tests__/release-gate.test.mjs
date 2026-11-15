import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  fetchJson,
  uniqueSlugsFromDiscovery,
  runReleaseGate,
  DEFAULT_RELEASE_GATE_TIMEOUT_MS,
  TEST_COORDS,
} from '../release-gate.mjs';

describe('Cold-Start Aware Release Gate Tests', () => {
  const createMockLogger = () => ({
    log: () => {},
    warn: () => {},
    error: () => {},
  });

  const createSuccessfulMockFetch = () => {
    return async (url) => {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname === '/api/health') {
        return {
          status: 200,
          json: async () => ({
            status: 'ok',
            platform: { build: '51054d8', tier: 'free' },
          }),
        };
      }
      if (parsedUrl.pathname === '/api/marketplace/discovery') {
        return {
          status: 200,
          json: async () => ({
            collections: [
              {
                restaurants: [
                  { slug: 'mana-inti-pune', restaurantSlug: 'mana-inti-pune' },
                  { slug: 'inti-bhojanam-kitchen', restaurantSlug: 'inti-bhojanam-kitchen' },
                ],
              },
            ],
          }),
        };
      }
      if (parsedUrl.pathname === '/api/marketplace/search') {
        return {
          status: 200,
          json: async () => ({
            meta: { totalResults: 5 },
          }),
        };
      }
      return {
        status: 404,
        json: async () => ({}),
      };
    };
  };

  it('1. Default timeout is 60,000ms to accommodate Render cold starts', () => {
    assert.equal(DEFAULT_RELEASE_GATE_TIMEOUT_MS, 60_000);
  });

  it('2. Custom timeout configuration via parameter is respected', async () => {
    let capturedTimeout = null;
    const mockFetch = async (url, options) => {
      // AbortSignal in Node 20+ has timeout metadata or aborts
      return {
        status: 200,
        json: async () => ({ status: 'ok', platform: { build: '51054d8' } }),
      };
    };

    const result = await runReleaseGate({
      apiBase: 'https://test-backend.example.com',
      timeoutMs: 45_000,
      coords: [],
      fetchFn: mockFetch,
      logger: createMockLogger(),
    });

    assert.equal(result.timeoutMs, 45_000);
  });

  it('3. Successful responses across health, discovery, and search — PASS', async () => {
    const mockFetch = createSuccessfulMockFetch();

    const result = await runReleaseGate({
      apiBase: 'https://test-backend.example.com',
      fetchFn: mockFetch,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, true);
    assert.equal(result.failures.length, 0);
    assert.equal(result.build, '51054d8');
    assert.equal(result.discovery.length, 2);
    assert.ok(result.searchTotal > 0);
  });

  it('4. Health check timeout failure — FAIL with descriptive timeout message', async () => {
    const mockFetch = async (url) => {
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      throw err;
    };

    const result = await runReleaseGate({
      apiBase: 'https://test-backend.example.com',
      timeoutMs: 10_000,
      fetchFn: mockFetch,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.ok(result.failures.some((f) => f.includes('health error: Request timed out after 10000ms')));
  });

  it('5. Discovery timeout failure — FAIL with coordinate identification', async () => {
    const mockFetch = async (url) => {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname === '/api/health') {
        return {
          status: 200,
          json: async () => ({ status: 'ok', platform: { build: '51054d8' } }),
        };
      }
      if (parsedUrl.pathname === '/api/marketplace/discovery') {
        const err = new Error('The operation was aborted due to timeout');
        err.name = 'TimeoutError';
        throw err;
      }
      return {
        status: 200,
        json: async () => ({ meta: { totalResults: 1 } }),
      };
    };

    const result = await runReleaseGate({
      apiBase: 'https://test-backend.example.com',
      timeoutMs: 15_000,
      fetchFn: mockFetch,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.ok(result.failures.some((f) => f.includes('discovery Pune-mana-inti error: Request timed out after 15000ms')));
  });

  it('6. Search timeout failure — FAIL', async () => {
    const mockFetch = async (url) => {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname === '/api/health') {
        return {
          status: 200,
          json: async () => ({ status: 'ok', platform: { build: '51054d8' } }),
        };
      }
      if (parsedUrl.pathname === '/api/marketplace/discovery') {
        return {
          status: 200,
          json: async () => ({
            collections: [{ restaurants: [{ slug: 'mana-inti' }] }],
          }),
        };
      }
      if (parsedUrl.pathname === '/api/marketplace/search') {
        const err = new Error('The operation was aborted due to timeout');
        err.name = 'TimeoutError';
        throw err;
      }
      return { status: 404, json: async () => ({}) };
    };

    const result = await runReleaseGate({
      apiBase: 'https://test-backend.example.com',
      timeoutMs: 20_000,
      fetchFn: mockFetch,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.ok(result.failures.some((f) => f.includes('search error: Request timed out after 20000ms')));
  });

  it('7. Health endpoint unhealthy status or non-200 — FAIL', async () => {
    const mockFetch = async () => ({
      status: 503,
      json: async () => ({ status: 'down' }),
    });

    const result = await runReleaseGate({
      apiBase: 'https://test-backend.example.com',
      fetchFn: mockFetch,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.ok(result.failures.some((f) => f.includes('health HTTP 503')));
  });

  it('8. UAT / Sandbox tenant detected in discovery — FAIL', async () => {
    const mockFetch = async (url) => {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname === '/api/health') {
        return {
          status: 200,
          json: async () => ({ status: 'ok', platform: { build: '51054d8' } }),
        };
      }
      if (parsedUrl.pathname === '/api/marketplace/discovery') {
        return {
          status: 200,
          json: async () => ({
            collections: [
              {
                restaurants: [
                  { slug: 'uat-test-kitchen-1', restaurantSlug: 'uat-test-kitchen-1' },
                ],
              },
            ],
          }),
        };
      }
      if (parsedUrl.pathname === '/api/marketplace/search') {
        return {
          status: 200,
          json: async () => ({ meta: { totalResults: 1 } }),
        };
      }
      return { status: 404, json: async () => ({}) };
    };

    const result = await runReleaseGate({
      apiBase: 'https://test-backend.example.com',
      fetchFn: mockFetch,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.ok(result.failures.some((f) => f.includes('includes UAT/sandbox tenant')));
  });

  it('9. Zero restaurants in discovery across all coordinates — FAIL', async () => {
    const mockFetch = async (url) => {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname === '/api/health') {
        return {
          status: 200,
          json: async () => ({ status: 'ok', platform: { build: '51054d8' } }),
        };
      }
      if (parsedUrl.pathname === '/api/marketplace/discovery') {
        return {
          status: 200,
          json: async () => ({ collections: [] }),
        };
      }
      if (parsedUrl.pathname === '/api/marketplace/search') {
        return {
          status: 200,
          json: async () => ({ meta: { totalResults: 1 } }),
        };
      }
      return { status: 404, json: async () => ({}) };
    };

    const result = await runReleaseGate({
      apiBase: 'https://test-backend.example.com',
      fetchFn: mockFetch,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.ok(result.failures.some((f) => f.includes('discovery returned zero restaurants')));
  });

  it('10. Zero search results in Pune coords — FAIL', async () => {
    const mockFetch = async (url) => {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname === '/api/health') {
        return {
          status: 200,
          json: async () => ({ status: 'ok', platform: { build: '51054d8' } }),
        };
      }
      if (parsedUrl.pathname === '/api/marketplace/discovery') {
        return {
          status: 200,
          json: async () => ({
            collections: [{ restaurants: [{ slug: 'mana-inti' }] }],
          }),
        };
      }
      if (parsedUrl.pathname === '/api/marketplace/search') {
        return {
          status: 200,
          json: async () => ({ meta: { totalResults: 0 } }),
        };
      }
      return { status: 404, json: async () => ({}) };
    };

    const result = await runReleaseGate({
      apiBase: 'https://test-backend.example.com',
      fetchFn: mockFetch,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.ok(result.failures.some((f) => f.includes('search returned zero results')));
  });
});

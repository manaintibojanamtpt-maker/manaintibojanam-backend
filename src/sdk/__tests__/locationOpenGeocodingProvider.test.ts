import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../core/resultHelpers';
import { createLocationSDK } from '../location/createLocationSDK';
import { createGeocodingProvider } from '../location/providers/ProviderFactory';
import {
  createInMemoryOpenGeocodingCache,
} from '../location/providers/open-geocoding/OpenGeocodingCache';
import { createNoOpOpenGeocodingRateLimiter } from '../location/providers/open-geocoding/OpenGeocodingRateLimiter';
import { createOpenGeocodingProvider } from '../location/providers/open-geocoding/OpenGeocodingProvider';
import type {
  OpenGeocodingHttpPort,
  OpenGeocodingHttpResponse,
} from '../location/providers/open-geocoding/OpenGeocodingPorts';
import { buildForwardGeocodeQuery } from '../location/providers/open-geocoding/mapOpenGeocodingResults';

const PUNE_SEARCH_RESPONSE = JSON.stringify([
  {
    place_id: 1,
    lat: '18.5204',
    lon: '73.8567',
    display_name: 'Pune, Maharashtra, India',
    importance: 0.62,
    address: {
      city: 'Pune',
      state: 'Maharashtra',
      postcode: '411001',
      country_code: 'in',
    },
  },
]);

const PUNE_REVERSE_RESPONSE = JSON.stringify({
  place_id: 2,
  lat: '18.5204',
  lon: '73.8567',
  display_name: 'FC Road, Pune, Maharashtra, 411005, India',
  importance: 0.4,
  address: {
    road: 'FC Road',
    city: 'Pune',
    state: 'Maharashtra',
    postcode: '411005',
    country_code: 'in',
  },
});

interface MockHttpOptions {
  readonly onRequest?: (url: string, headers: Readonly<Record<string, string>>) => void;
  readonly searchBody?: string;
  readonly reverseBody?: string;
  readonly searchStatus?: number;
  readonly reverseStatus?: number;
}

function createMockOpenGeocodingHttp(options: MockHttpOptions = {}): {
  port: OpenGeocodingHttpPort;
  getCallCount: () => number;
} {
  let calls = 0;

  const port: OpenGeocodingHttpPort = {
    async get(url, headers) {
      calls += 1;
      options.onRequest?.(url, headers);

      if (url.includes('/search')) {
        const status = options.searchStatus ?? 200;
        const body = options.searchBody ?? PUNE_SEARCH_RESPONSE;
        return sdkOk({ status, body });
      }

      if (url.includes('/reverse')) {
        const status = options.reverseStatus ?? 200;
        const body = options.reverseBody ?? PUNE_REVERSE_RESPONSE;
        return sdkOk({ status, body });
      }

      return sdkOk({ status: 404, body: 'not found' });
    },
  };

  return { port, getCallCount: () => calls };
}

function createTestOpenGeocodingProvider(http: OpenGeocodingHttpPort) {
  return createOpenGeocodingProvider({
    http,
    rateLimiter: createNoOpOpenGeocodingRateLimiter(),
    config: {
      maxRetries: 0,
      retryDelayMs: 0,
      minRequestIntervalMs: 0,
    },
  });
}

describe('OpenGeocodingProvider (M2 PR-8)', () => {
  it('searchAddress maps Nominatim response to AddressSearchResult', async () => {
    const { port } = createMockOpenGeocodingHttp();
    const provider = createTestOpenGeocodingProvider(port);

    const result = await provider.searchAddress('Pune');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value[0]?.displayName, 'Pune, Maharashtra, India');
      assert.equal(result.value[0]?.pincode, '411001');
      assert.equal(result.value[0]?.provider, 'nominatim');
      assert.ok(result.value[0]!.confidence > 0);
    }
  });

  it('forwardGeocode returns geohash and parsed address', async () => {
    const { port } = createMockOpenGeocodingHttp();
    const provider = createTestOpenGeocodingProvider(port);

    const result = await provider.forwardGeocode({ query: 'Pune, Maharashtra' });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.formattedAddress, 'Pune, Maharashtra, India');
      assert.equal(result.value.geohash.length, 7);
      assert.equal(result.value.parsed?.stateName, 'Maharashtra');
    }
  });

  it('reverseGeocode preserves input coordinates', async () => {
    const { port } = createMockOpenGeocodingHttp();
    const provider = createTestOpenGeocodingProvider(port);
    const point = { lat: 18.5204, lng: 73.8567 };

    const result = await provider.reverseGeocode(point);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.point.lat, point.lat);
      assert.equal(result.value.point.lng, point.lng);
      assert.match(result.value.formattedAddress, /Pune/);
    }
  });

  it('sends configurable User-Agent header', async () => {
    let capturedAgent = '';
    const { port } = createMockOpenGeocodingHttp({
      onRequest: (_url, headers) => {
        capturedAgent = headers['User-Agent'] ?? '';
      },
    });

    const provider = createOpenGeocodingProvider({
      http: port,
      rateLimiter: createNoOpOpenGeocodingRateLimiter(),
      config: {
        userAgent: 'BhojanOS-Test-Agent/1.0',
        maxRetries: 0,
        minRequestIntervalMs: 0,
      },
    });

    await provider.searchAddress('Pune');
    assert.equal(capturedAgent, 'BhojanOS-Test-Agent/1.0');
  });

  it('uses cache hook to avoid duplicate HTTP calls', async () => {
    const { port, getCallCount } = createMockOpenGeocodingHttp();
    const cache = createInMemoryOpenGeocodingCache();
    const provider = createOpenGeocodingProvider({
      http: port,
      cache,
      rateLimiter: createNoOpOpenGeocodingRateLimiter(),
      config: { maxRetries: 0, minRequestIntervalMs: 0 },
    });

    await provider.searchAddress('Pune');
    await provider.searchAddress('Pune');
    assert.equal(getCallCount(), 1);
  });

  it('retries on rate limit then succeeds', async () => {
    let searchCalls = 0;
    const port: OpenGeocodingHttpPort = {
      async get(url) {
        if (!url.includes('/search')) {
          return sdkOk({ status: 404, body: '' });
        }
        searchCalls += 1;
        if (searchCalls === 1) {
          return sdkOk({ status: 429, body: 'rate limited' });
        }
        return sdkOk({ status: 200, body: PUNE_SEARCH_RESPONSE });
      },
    };

    const provider = createOpenGeocodingProvider({
      http: port,
      rateLimiter: createNoOpOpenGeocodingRateLimiter(),
      config: {
        maxRetries: 1,
        retryDelayMs: 1,
        minRequestIntervalMs: 0,
      },
    });

    const result = await provider.searchAddress('Pune');
    assert.equal(result.ok, true);
    assert.equal(searchCalls, 2);
  });

  it('returns NOT_FOUND when Nominatim returns empty array', async () => {
    const { port } = createMockOpenGeocodingHttp({ searchBody: '[]' });
    const provider = createTestOpenGeocodingProvider(port);

    const result = await provider.searchAddress('NowherePlace');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'NOT_FOUND');
    }
  });

  it('returns VALIDATION for empty search query', async () => {
    const { port } = createMockOpenGeocodingHttp();
    const provider = createTestOpenGeocodingProvider(port);

    const result = await provider.searchAddress('   ');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'VALIDATION');
    }
  });

  it('buildForwardGeocodeQuery joins structured address fields', () => {
    const result = buildForwardGeocodeQuery({
      structured: {
        street: 'FC Road',
        cityName: 'Pune',
        stateName: 'Maharashtra',
        pincode: '411005',
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.match(result.value, /FC Road/);
      assert.match(result.value, /411005/);
    }
  });

  it('createGeocodingProvider({ kind: nominatim }) returns OpenGeocodingProvider', () => {
    const provider = createGeocodingProvider({
      kind: 'nominatim',
      openGeocoding: {
        http: createMockOpenGeocodingHttp().port,
        rateLimiter: createNoOpOpenGeocodingRateLimiter(),
      },
    });
    assert.equal(provider.kind, 'nominatim');
  });

  it('registry wiring resolves geocoding through LocationSDK', async () => {
    const { createDefaultLocationProviderRegistry } = await import(
      '../location/providers/ProviderFactory'
    );
    const provider = createTestOpenGeocodingProvider(createMockOpenGeocodingHttp().port);
    const registry = createDefaultLocationProviderRegistry().register('geocoding', provider);
    const sdk = createLocationSDK({ providerRegistry: registry });

    const result = await sdk.searchAddress('Pune');
    assert.equal(result.ok, true);
  });
});

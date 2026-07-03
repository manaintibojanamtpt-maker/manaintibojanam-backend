import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkFail, sdkError, sdkOk } from '../core/resultHelpers';
import type { TenantId } from '../core/types';
import type { BranchId } from '../discovery/types/branded';
import { createSearchSDK, resolveSearchEnabled } from '../search/createSearchSDK';
import { createDefaultSearchAdapter } from '../search/adapters/DefaultSearchAdapter';
import type { DefaultSearchAdapterDeps } from '../search/adapters/DefaultSearchAdapter';
import { createStubDiscoveryAdapter } from '../discovery/adapters/StubDiscoveryAdapter';
import { createStubSearchAdapter } from '../search/adapters/StubSearchAdapter';
import { createStubSearchRepository } from '../search/repository/adapters/StubSearchRepository';
import type { SearchRepository } from '../search/repository/SearchRepository';
import type { SearchIndexHit } from '../search/dto';

const CUSTOMER_POINT = { lat: 18.5204, lng: 73.8567 };

const SAMPLE_HIT: SearchIndexHit = {
  tenantId: 'tenant-spice' as TenantId,
  branchId: 'tenant-spice' as BranchId,
  matchType: 'prefix',
  field: 'name',
  score: 0.92,
  snippet: 'Spice Kitchen',
};

const flagsOn = () => true;
const flagsOff = () => false;
const repositoryOn = (flag: string) => flag === 'FF_SEARCH_REPOSITORY_ENABLED';
const repositoryOff = () => false;

const createMockRepository = (
  overrides: Partial<SearchRepository> = {}
): SearchRepository => ({
  ...createStubSearchRepository(),
  ...overrides,
});

const createOrchestrationAdapter = (
  overrides: Partial<DefaultSearchAdapterDeps> & { repository?: SearchRepository } = {}
) =>
  createDefaultSearchAdapter({
    repository: overrides.repository ?? createMockRepository(),
    repositoryEnabled: overrides.repositoryEnabled ?? true,
    discoverySdk: overrides.discoverySdk ?? createStubDiscoveryAdapter(),
    discoveryEnabled: overrides.discoveryEnabled ?? false,
    featureFlags: overrides.featureFlags ?? flagsOn,
    discoveryFeatureFlags: overrides.discoveryFeatureFlags,
  });

describe('SearchSDK orchestration (M4 PR-5)', () => {
  it('resolveSearchEnabled returns false by default', () => {
    assert.equal(resolveSearchEnabled(), false);
    assert.equal(resolveSearchEnabled({ featureFlags: flagsOn }), true);
  });

  it('createSearchSDK returns stub adapter when FF_SEARCH_ENABLED is off', async () => {
    const sdk = createSearchSDK({ featureFlags: flagsOff });
    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'biryani',
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('createSearchSDK wires DefaultSearchAdapter when FF_SEARCH_ENABLED is on', async () => {
    const sdk = createSearchSDK({
      featureFlags: (flag) =>
        flag === 'FF_SEARCH_ENABLED' || flag === 'FF_SEARCH_REPOSITORY_ENABLED',
      searchRepository: createMockRepository({
        searchRestaurants: async () => sdkOk([SAMPLE_HIT]),
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'spice',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants.length, 1);
    assert.equal(result.value.restaurants[0]?.restaurant.name, 'Spice Kitchen');
    assert.equal(result.value.totalMatches, 1);
  });

  it('returns REPOSITORY_UNAVAILABLE when repository flag is off', async () => {
    const sdk = createSearchSDK({
      featureFlags: (flag) => flag === 'FF_SEARCH_ENABLED',
      searchRepository: createStubSearchRepository(),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'biryani',
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
    assert.match(result.error.message, /repository/i);
  });

  it('returns empty SearchResult when repository returns no hits', async () => {
    const sdk = createOrchestrationAdapter({
      repository: createMockRepository({
        searchRestaurants: async () => sdkOk([]),
      }),
      featureFlags: flagsOn,
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'unknown',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants.length, 0);
    assert.equal(result.value.totalMatches, 0);
    assert.equal(result.value.metadata.flags.searchEnabled, true);
  });

  it('rejects invalid query without customer location', async () => {
    const sdk = createOrchestrationAdapter();

    const result = await sdk.search({
      customerPoint: { lat: Number.NaN, lng: 73.85 },
      text: 'biryani',
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'VALIDATION');
  });

  it('rejects empty query without filters', async () => {
    const sdk = createOrchestrationAdapter();

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'VALIDATION');
  });

  it('maps repository errors to UNAVAILABLE', async () => {
    const sdk = createOrchestrationAdapter({
      repository: createMockRepository({
        searchRestaurants: async () =>
          sdkFail(sdkError('UNAVAILABLE', 'Firestore read failed')),
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'biryani',
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });

  it('records telemetry timing in SearchResult metadata', async () => {
    const sdk = createOrchestrationAdapter({
      repository: createMockRepository({
        searchRestaurants: async () => sdkOk([SAMPLE_HIT]),
      }),
      featureFlags: flagsOn,
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'spice',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(result.value.metadata.timingMs);
    assert.equal(typeof result.value.metadata.timingMs?.normalizeMs, 'number');
    assert.equal(typeof result.value.metadata.timingMs?.repositoryMs, 'number');
    assert.equal(typeof result.value.metadata.timingMs?.totalMs, 'number');
  });

  it('invokes cuisine repository path when cuisine filters are present', async () => {
    let cuisineInvoked = false;

    const sdk = createOrchestrationAdapter({
      repository: createMockRepository({
        searchCuisine: async () => {
          cuisineInvoked = true;
          return sdkOk([SAMPLE_HIT]);
        },
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      filters: {
        cuisine: { tags: ['biryani'], matchMode: 'any' },
      },
    });

    assert.equal(cuisineInvoked, true);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value.metadata.appliedFilters, ['cuisine']);
  });

  it('intersects hits when multiple repository paths are used', async () => {
    const otherHit: SearchIndexHit = {
      tenantId: 'tenant-other' as TenantId,
      branchId: 'tenant-other' as BranchId,
      matchType: 'contains',
      field: 'name',
      score: 0.5,
      snippet: 'Other Kitchen',
    };

    const sdk = createOrchestrationAdapter({
      repository: createMockRepository({
        searchRestaurants: async () => sdkOk([SAMPLE_HIT, otherHit]),
        searchCuisine: async () => sdkOk([SAMPLE_HIT]),
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'spice',
      filters: {
        cuisine: { tags: ['biryani'], matchMode: 'any' },
      },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants.length, 1);
    assert.equal(String(result.value.restaurants[0]?.restaurant.tenantId), 'tenant-spice');
  });

  it('suggest and autocomplete remain NOT_CONFIGURED when suggestion flags are off', async () => {
    const sdk = createOrchestrationAdapter({
      featureFlags: (flag) =>
        flag === 'FF_SEARCH_ENABLED' || flag === 'FF_SEARCH_REPOSITORY_ENABLED',
    });

    const suggest = await sdk.suggest({
      customerPoint: CUSTOMER_POINT,
      text: 'bir',
    });
    assert.equal(suggest.ok, false);
    if (suggest.ok) return;
    assert.equal(suggest.error.code, 'NOT_CONFIGURED');

    const autocomplete = await sdk.autocomplete({ prefix: 'bir' });
    assert.equal(autocomplete.ok, false);
    if (autocomplete.ok) return;
    assert.equal(autocomplete.error.code, 'NOT_CONFIGURED');
  });

  it('StubSearchAdapter remains available for rollback', async () => {
    const sdk = createStubSearchAdapter();
    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'biryani',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('returns empty result for facet-only queries without repository invocation', async () => {
    let repositoryCalled = false;
    const sdk = createOrchestrationAdapter({
      repository: createMockRepository({
        searchRestaurants: async () => {
          repositoryCalled = true;
          return sdkOk([SAMPLE_HIT]);
        },
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      openNow: true,
    });

    assert.equal(repositoryCalled, false);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants.length, 0);
    assert.ok(result.value.metadata.appliedFilters.includes('openNow'));
  });
});

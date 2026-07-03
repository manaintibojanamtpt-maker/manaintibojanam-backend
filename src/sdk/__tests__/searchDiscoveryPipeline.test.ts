import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkFail, sdkError, sdkOk } from '../core/resultHelpers';
import type { TenantId } from '../core/types';
import type { BranchId, Geohash } from '../discovery/types/branded';
import type { NearbyRestaurant } from '../discovery/dto/candidates';
import type { DiscoverySDK } from '../discovery/contracts/DiscoverySDK';
import { createStubDiscoveryAdapter } from '../discovery/adapters/StubDiscoveryAdapter';
import { createDefaultSearchAdapter } from '../search/adapters/DefaultSearchAdapter';
import { createSearchSDK } from '../search/createSearchSDK';
import { createStubSearchRepository } from '../search/repository/adapters/StubSearchRepository';
import type { SearchRepository } from '../search/repository/SearchRepository';
import type { SearchIndexHit } from '../search/dto';
import { intersectSearchHitsWithDiscovery } from '../search/pipeline/DiscoveryIntersection';
import { enrichSearchWithDiscovery } from '../search/pipeline/SearchDiscoveryEnricher';
import { buildDiscoveryQueryFromSearch } from '../search/pipeline/buildDiscoveryQuery';

const CUSTOMER_POINT = { lat: 18.5204, lng: 73.8567 };

const SAMPLE_HIT: SearchIndexHit = {
  tenantId: 'tenant-spice' as TenantId,
  branchId: 'tenant-spice' as BranchId,
  matchType: 'prefix',
  field: 'name',
  score: 0.92,
  snippet: 'Spice Kitchen',
};

const OTHER_HIT: SearchIndexHit = {
  tenantId: 'tenant-other' as TenantId,
  branchId: 'tenant-other' as BranchId,
  matchType: 'contains',
  field: 'name',
  score: 0.7,
  snippet: 'Other Kitchen',
};

const SAMPLE_RESTAURANT: NearbyRestaurant = {
  tenantId: 'tenant-spice' as TenantId,
  branchId: 'tenant-spice' as BranchId,
  name: 'Spice Kitchen',
  slug: 'spice-kitchen',
  point: { lat: 18.5204, lng: 73.8567 },
  distanceKm: 1.4,
  geohash: 'tdr1w' as Geohash,
  eligibility: {
    status: 'serviceable',
    isServiceable: true,
    distanceKm: 1.4,
  },
  isOpen: true,
  rating: 4.6,
  ranking: {
    score: 0.91,
    rank: 1,
    factors: [{ factor: 'distance', weight: 0.4, signal: 0.9, contribution: 0.36 }],
  },
};

const searchFlagsOn = (flag: string) =>
  flag === 'FF_SEARCH_ENABLED' || flag === 'FF_SEARCH_REPOSITORY_ENABLED';

const discoveryFlagsOn = (flag: string) => flag === 'FF_DISCOVERY_ENABLED';

const allFlagsOn = (flag: string) => searchFlagsOn(flag) || discoveryFlagsOn(flag);

const createMockRepository = (
  overrides: Partial<SearchRepository> = {}
): SearchRepository => ({
  ...createStubSearchRepository(),
  ...overrides,
});

const createMockDiscoverySdk = (overrides: Partial<DiscoverySDK> = {}): DiscoverySDK => {
  const stub = createStubDiscoveryAdapter();
  return { ...stub, ...overrides };
};

const createEnrichedAdapter = (input: {
  readonly repository?: SearchRepository;
  readonly discoverySdk?: DiscoverySDK;
  readonly discoveryEnabled?: boolean;
}) =>
  createDefaultSearchAdapter({
    repository:
      input.repository ??
      createMockRepository({
        searchRestaurants: async () => sdkOk([SAMPLE_HIT]),
      }),
    repositoryEnabled: true,
    discoverySdk: input.discoverySdk ?? createMockDiscoverySdk(),
    discoveryEnabled: input.discoveryEnabled ?? true,
    featureFlags: allFlagsOn,
    discoveryFeatureFlags: discoveryFlagsOn,
  });

describe('Search discovery pipeline (M4 PR-6)', () => {
  it('buildDiscoveryQueryFromSearch forwards geo context to DiscoverySDK', () => {
    const discoveryQuery = buildDiscoveryQueryFromSearch({
      customerPoint: CUSTOMER_POINT,
      text: 'biryani',
      radiusKm: 8,
      filters: {
        cuisine: { tags: ['biryani'], matchMode: 'any' },
        area: { areaCode: 'KP01' },
      },
      openNow: true,
    });

    assert.equal(discoveryQuery.radiusKm, 8);
    assert.equal(discoveryQuery.searchText, 'biryani');
    assert.deepEqual(discoveryQuery.cuisineTags, ['biryani']);
    assert.equal(discoveryQuery.areaCode, 'KP01');
    assert.equal(discoveryQuery.includeClosed, false);
  });

  it('intersectSearchHitsWithDiscovery preserves Discovery ranking order', () => {
    const pairs = intersectSearchHitsWithDiscovery(
      [OTHER_HIT, SAMPLE_HIT],
      {
        restaurants: [SAMPLE_RESTAURANT],
        totalCandidates: 3,
        queryRadiusKm: 10,
        rankedAt: Date.now(),
      }
    );

    assert.equal(pairs.length, 1);
    assert.equal(String(pairs[0]?.restaurant.tenantId), 'tenant-spice');
    assert.equal(pairs[0]?.restaurant.distanceKm, 1.4);
  });

  it('enriches search results with Discovery NearbyRestaurant data', async () => {
    const sdk = createEnrichedAdapter({
      discoverySdk: createMockDiscoverySdk({
        discoverNearby: async () =>
          sdkOk({
            restaurants: [SAMPLE_RESTAURANT],
            totalCandidates: 2,
            queryRadiusKm: 10,
            rankedAt: Date.now(),
          }),
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'spice',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.restaurants.length, 1);
    assert.equal(result.value.restaurants[0]?.restaurant.distanceKm, 1.4);
    assert.equal(result.value.restaurants[0]?.restaurant.eligibility.isServiceable, true);
    assert.equal(result.value.totalDiscoveryCandidates, 2);
    assert.equal(result.value.metadata.discoveryEnrichmentEnabled, true);
    assert.equal(result.value.metadata.discoverySdkVersion, '0.6.0-geoindex');
    assert.ok(result.value.metadata.correlationId?.startsWith('search-'));
    assert.equal(typeof result.value.metadata.timingMs?.discoveryMs, 'number');
    assert.equal(typeof result.value.metadata.timingMs?.filterMs, 'number');
  });

  it('returns empty result when repository returns no hits without calling Discovery', async () => {
    let discoveryCalled = false;
    const sdk = createEnrichedAdapter({
      repository: createMockRepository({
        searchRestaurants: async () => sdkOk([]),
      }),
      discoverySdk: createMockDiscoverySdk({
        discoverNearby: async () => {
          discoveryCalled = true;
          return sdkOk({
            restaurants: [SAMPLE_RESTAURANT],
            totalCandidates: 1,
            queryRadiusKm: 10,
            rankedAt: Date.now(),
          });
        },
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'spice',
    });

    assert.equal(discoveryCalled, false);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants.length, 0);
  });

  it('returns empty enriched result when Discovery returns no intersecting restaurants', async () => {
    const sdk = createEnrichedAdapter({
      discoverySdk: createMockDiscoverySdk({
        discoverNearby: async () =>
          sdkOk({
            restaurants: [],
            totalCandidates: 0,
            queryRadiusKm: 10,
            rankedAt: Date.now(),
          }),
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'spice',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants.length, 0);
    assert.equal(result.value.metadata.discoveryEnrichmentEnabled, true);
    assert.equal(result.value.totalDiscoveryCandidates, 0);
  });

  it('supports partial enrichment when only some hits intersect Discovery', async () => {
    const sdk = createEnrichedAdapter({
      repository: createMockRepository({
        searchRestaurants: async () => sdkOk([SAMPLE_HIT, OTHER_HIT]),
      }),
      discoverySdk: createMockDiscoverySdk({
        discoverNearby: async () =>
          sdkOk({
            restaurants: [SAMPLE_RESTAURANT],
            totalCandidates: 5,
            queryRadiusKm: 10,
            rankedAt: Date.now(),
          }),
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'kitchen',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants.length, 1);
    assert.equal(String(result.value.restaurants[0]?.restaurant.tenantId), 'tenant-spice');
    assert.equal(result.value.totalDiscoveryCandidates, 5);
  });

  it('falls back to repository placeholders when FF_DISCOVERY_ENABLED is off', async () => {
    const sdk = createDefaultSearchAdapter({
      repository: createMockRepository({
        searchRestaurants: async () => sdkOk([SAMPLE_HIT]),
      }),
      repositoryEnabled: true,
      discoverySdk: createMockDiscoverySdk({
        discoverNearby: async () => {
          throw new Error('Discovery must not be called when enrichment is disabled');
        },
      }),
      discoveryEnabled: false,
      featureFlags: searchFlagsOn,
      discoveryFeatureFlags: () => false,
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'spice',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants.length, 1);
    assert.equal(result.value.restaurants[0]?.restaurant.distanceKm, 0);
    assert.equal(result.value.metadata.discoveryEnrichmentEnabled, false);
    assert.match(result.value.metadata.discoveryEnrichmentFallbackReason ?? '', /FF_DISCOVERY_ENABLED/);
    assert.ok(result.value.metadata.correlationId?.startsWith('search-'));
  });

  it('falls back safely when DiscoverySDK returns NOT_CONFIGURED', async () => {
    const sdk = createEnrichedAdapter({
      discoverySdk: createStubDiscoveryAdapter(),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'spice',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants.length, 1);
    assert.equal(result.value.restaurants[0]?.restaurant.distanceKm, 0);
    assert.equal(result.value.metadata.discoveryEnrichmentEnabled, false);
    assert.match(
      result.value.metadata.discoveryEnrichmentFallbackReason ?? '',
      /DiscoverySDK dependency is unavailable/i
    );
  });

  it('falls back safely when DiscoverySDK returns UNAVAILABLE', async () => {
    const sdk = createEnrichedAdapter({
      discoverySdk: createMockDiscoverySdk({
        discoverNearby: async () => sdkFail(sdkError('UNAVAILABLE', 'Discovery offline')),
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'spice',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.metadata.discoveryEnrichmentEnabled, false);
    assert.match(result.value.metadata.discoveryEnrichmentFallbackReason ?? '', /Discovery offline/);
  });

  it('propagates correlation ID through enrichment helper', async () => {
    const enrichment = await enrichSearchWithDiscovery(
      { customerPoint: CUSTOMER_POINT, text: 'spice' },
      [SAMPLE_HIT],
      {
        discoverySdk: createMockDiscoverySdk({
          discoverNearby: async () =>
            sdkOk({
              restaurants: [SAMPLE_RESTAURANT],
              totalCandidates: 1,
              queryRadiusKm: 10,
              rankedAt: Date.now(),
            }),
        }),
        discoveryEnabled: true,
        correlationIdFactory: () => 'search-test-correlation',
      }
    );

    assert.equal(enrichment.ok, true);
    if (!enrichment.ok) return;
    assert.equal(enrichment.value.correlationId, 'search-test-correlation');
    assert.equal(enrichment.value.enrichmentApplied, true);
  });

  it('createSearchSDK wires discovery enrichment when both flags are on', async () => {
    const sdk = createSearchSDK({
      featureFlags: allFlagsOn,
      discoveryFeatureFlags: discoveryFlagsOn,
      searchRepository: createMockRepository({
        searchRestaurants: async () => sdkOk([SAMPLE_HIT]),
      }),
      discoverySdk: createMockDiscoverySdk({
        discoverNearby: async () =>
          sdkOk({
            restaurants: [SAMPLE_RESTAURANT],
            totalCandidates: 1,
            queryRadiusKm: 10,
            rankedAt: Date.now(),
          }),
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'spice',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants[0]?.restaurant.distanceKm, 1.4);
    assert.equal(result.value.metadata.flags.discoveryEnabled, true);
  });

  it('filters enriched restaurants by openNow facet without re-ranking', async () => {
    const closedRestaurant: NearbyRestaurant = {
      ...SAMPLE_RESTAURANT,
      isOpen: false,
    };

    const sdk = createEnrichedAdapter({
      discoverySdk: createMockDiscoverySdk({
        discoverNearby: async () =>
          sdkOk({
            restaurants: [closedRestaurant],
            totalCandidates: 1,
            queryRadiusKm: 10,
            rankedAt: Date.now(),
          }),
      }),
    });

    const result = await sdk.search({
      customerPoint: CUSTOMER_POINT,
      text: 'spice',
      openNow: true,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants.length, 0);
    assert.ok(result.value.metadata.appliedFilters.includes('openNow'));
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapToEligibleCandidate } from '../../domain/discovery/eligibility/EligibilityMapper';
import { createDiscoverySDK } from '../discovery/createDiscoverySDK';
import { createDefaultEligibilityEngine } from '../discovery/eligibility/DefaultEligibilityEngine';
import { createDefaultRankingEngine } from '../discovery/ranking/DefaultRankingEngine';
import { runDiscoveryPipeline } from '../discovery/pipeline/DiscoveryPipeline';
import { createTenantDiscoveryRepositoryAdapter } from '../discovery/repository/adapters/TenantDiscoveryRepositoryAdapter';
import type { DiscoveryCandidate } from '../discovery/dto/candidates';
import type { DiscoveryPipelineTrace } from '../discovery/pipeline/types';
import { sdkOk } from '../core/resultHelpers';
import type { TenantReadRecord, TenantRepositoryPort } from '../discovery/repository/ports/TenantRepositoryPort';

const CUSTOMER_POINT = { lat: 18.521, lng: 73.857 };
const BRANCH_POINT = { lat: 18.5204, lng: 73.8567 };

const ACTIVE_TENANT: TenantReadRecord = {
  id: 'tenant-kitchen-a',
  slug: 'spice-kitchen',
  name: 'Spice Kitchen',
  status: 'active',
  storeStatus: 'published',
  location: { lat: 18.5204, lng: 73.8567, geohash: 'tdr1w' },
  deliveryConfig: { maxRadius: 5, prepTime: 25 },
  storeOperations: { isStoreOpen: true },
  ratingAggregate: 4.5,
};

const CLOSED_TENANT: TenantReadRecord = {
  ...ACTIVE_TENANT,
  id: 'tenant-closed',
  slug: 'closed-kitchen',
  name: 'Closed Kitchen',
  storeOperations: { isStoreOpen: false },
};

const createTenantPort = (tenants: TenantReadRecord[]): TenantRepositoryPort => ({
  listActiveTenants: async () => sdkOk(tenants),
  getTenantsByIds: async (ids) => {
    const idSet = new Set(ids);
    return sdkOk(tenants.filter((tenant) => idSet.has(tenant.id)));
  },
});

const createPipelineDeps = (
  tenants: TenantReadRecord[],
  options: {
    eligibilityEnabled?: boolean;
    useWeightedRanking?: boolean;
    hooks?: { onStageComplete?: (trace: DiscoveryPipelineTrace) => void };
    limit?: number;
  } = {}
) => {
  const repository = createTenantDiscoveryRepositoryAdapter(createTenantPort(tenants));
  return {
    query: {
      customerPoint: CUSTOMER_POINT,
      limit: options.limit,
      cuisineTags: ['south-indian'],
    },
    repository,
    eligibilityEngine: createDefaultEligibilityEngine(),
    rankingEngine: createDefaultRankingEngine(),
    eligibilityEnabled: options.eligibilityEnabled ?? true,
    useWeightedRanking: options.useWeightedRanking ?? false,
    hooks: options.hooks,
  };
};

describe('DiscoveryPipeline (M3 PR-6)', () => {
  it('runs full pipeline successfully with telemetry', async () => {
    const traces: DiscoveryPipelineTrace[] = [];
    const result = await runDiscoveryPipeline(
      createPipelineDeps([ACTIVE_TENANT], {
        hooks: {
          onStageComplete: (trace) => traces.push(trace),
        },
      })
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.restaurants.length, 1);
    assert.equal(result.value.restaurants[0]?.name, 'Spice Kitchen');
    assert.equal(result.value.totalCandidates, 1);
    assert.ok(result.value.telemetry);
    assert.equal(result.value.telemetry?.counts.repositoryCount, 1);
    assert.equal(result.value.telemetry?.counts.eligibleCount, 1);
    assert.equal(result.value.telemetry?.counts.rankedCount, 1);
    assert.equal(result.value.telemetry?.counts.returnedCount, 1);
    assert.ok(result.value.telemetry?.timingMs.total >= 0);
    assert.equal(result.value.telemetry?.flags.eligibilityEnabled, true);
    assert.equal(traces.length, 5);
    assert.deepEqual(
      traces.map((trace) => trace.stage),
      ['repository', 'eligibility', 'ranking', 'mapping', 'total']
    );
  });

  it('returns empty result when repository has no candidates', async () => {
    const result = await runDiscoveryPipeline(createPipelineDeps([]));

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.restaurants.length, 0);
    assert.equal(result.value.telemetry?.counts.repositoryCount, 0);
    assert.equal(result.value.telemetry?.counts.eligibleCount, 0);
    assert.equal(result.value.telemetry?.counts.rankedCount, 0);
    assert.equal(result.value.telemetry?.counts.returnedCount, 0);
  });

  it('returns no restaurants when no candidates are eligible', async () => {
    const result = await runDiscoveryPipeline(
      createPipelineDeps([CLOSED_TENANT], { eligibilityEnabled: true })
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.telemetry?.counts.repositoryCount, 1);
    assert.equal(result.value.telemetry?.counts.eligibleCount, 0);
    assert.equal(result.value.telemetry?.counts.rankedCount, 0);
    assert.equal(result.value.restaurants.length, 0);
  });

  it('bypasses eligibility when eligibility flag is disabled', async () => {
    const result = await runDiscoveryPipeline(
      createPipelineDeps([CLOSED_TENANT], { eligibilityEnabled: false })
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.telemetry?.flags.eligibilityEnabled, false);
    assert.equal(result.value.telemetry?.counts.eligibleCount, 1);
    assert.equal(result.value.restaurants.length, 1);
  });

  it('uses distance-only ranking when weighted ranking is disabled', async () => {
    const result = await runDiscoveryPipeline(
      createPipelineDeps([ACTIVE_TENANT], {
        eligibilityEnabled: true,
        useWeightedRanking: false,
      })
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.telemetry?.flags.weightedRankingEnabled, false);
    assert.equal(result.value.restaurants[0]?.ranking?.factors.length, 1);
    assert.equal(result.value.restaurants[0]?.ranking?.factors[0]?.factor, 'distance');
  });

  it('uses weighted ranking when ranking flag is enabled', async () => {
    const result = await runDiscoveryPipeline(
      createPipelineDeps([ACTIVE_TENANT], {
        eligibilityEnabled: true,
        useWeightedRanking: true,
      })
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.telemetry?.flags.weightedRankingEnabled, true);
    assert.equal(result.value.restaurants[0]?.ranking?.factors.length, 8);
  });

  it('applies query limit to returned restaurants', async () => {
    const farTenant: TenantReadRecord = {
      ...ACTIVE_TENANT,
      id: 'tenant-far',
      slug: 'far-kitchen',
      name: 'Far Kitchen',
      location: { lat: 18.535, lng: 73.87, geohash: 'tdr1x' },
    };

    const result = await runDiscoveryPipeline(
      createPipelineDeps([ACTIVE_TENANT, farTenant], {
        limit: 1,
        eligibilityEnabled: true,
      })
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.telemetry?.counts.rankedCount, 2);
    assert.equal(result.value.telemetry?.counts.returnedCount, 1);
    assert.equal(result.value.restaurants.length, 1);
  });

  it('records per-stage timing metrics', async () => {
    const result = await runDiscoveryPipeline(createPipelineDeps([ACTIVE_TENANT]));

    assert.equal(result.ok, true);
    if (!result.ok) return;

    const timing = result.value.telemetry?.timingMs;
    assert.ok(timing);
    assert.ok(timing.repository >= 0);
    assert.ok(timing.eligibility >= 0);
    assert.ok(timing.ranking >= 0);
    assert.ok(timing.mapping >= 0);
    assert.ok(timing.total >= 0);
  });

  it('returns NOT_CONFIGURED when eligibility is enabled but engine is missing', async () => {
    const deps = createPipelineDeps([ACTIVE_TENANT]);
    const result = await runDiscoveryPipeline({
      ...deps,
      eligibilityEnabled: true,
      eligibilityEngine: undefined,
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });
});

describe('DefaultDiscoveryAdapter discoverNearby (M3 PR-6)', () => {
  it('wires discoverNearby through the pipeline', async () => {
    const sdk = createDiscoverySDK({
      repository: createTenantDiscoveryRepositoryAdapter(createTenantPort([ACTIVE_TENANT])),
      featureFlags: (flag) => flag === 'FF_DISCOVERY_ELIGIBILITY_ENABLED',
    });

    const result = await sdk.discoverNearby({
      customerPoint: CUSTOMER_POINT,
      customerGeohash: 'tdr1w',
      radiusKm: 5,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants[0]?.slug, 'spice-kitchen');
    assert.ok(result.value.telemetry);
  });

  it('stub adapter discoverNearby remains NOT_CONFIGURED', async () => {
    const sdk = createDiscoverySDK({ providerKind: 'stub' });
    const result = await sdk.discoverNearby({ customerPoint: CUSTOMER_POINT });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });
});

describe('DiscoveryMapper (M3 PR-6)', () => {
  it('maps ranked candidate fields to NearbyRestaurant', async () => {
    const candidate: DiscoveryCandidate = {
      tenantId: 'tenant-a',
      branchId: 'tenant-a',
      name: 'Spice Kitchen',
      slug: 'spice-kitchen',
      point: BRANCH_POINT,
      geohash: 'tdr1w',
      maxRadiusKm: 5,
      prepTimeMins: 25,
      isOpen: true,
      isLive: true,
      status: 'active',
      rating: 4.5,
    };

    const eligible = mapToEligibleCandidate(candidate, CUSTOMER_POINT);
    const ranked = createDefaultRankingEngine().rank([eligible], {
      query: { customerPoint: CUSTOMER_POINT },
      useWeightedRanking: true,
    });

    assert.equal(ranked.ok, true);
    if (!ranked.ok) return;

    const restaurant = ranked.value[0];
    assert.ok(restaurant);
    assert.equal(restaurant.candidate.candidate.slug, 'spice-kitchen');
    assert.ok(restaurant.breakdown.rank === 1);
  });
});

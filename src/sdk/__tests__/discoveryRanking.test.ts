import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDiscoveryRankingEngine } from '../../domain/discovery/ranking/RankingEngine';
import { rankEligibleCandidates } from '../../domain/discovery/ranking/RankingMapper';
import {
  sumActiveRankingWeights,
  validateRankingWeights,
} from '../../domain/discovery/ranking/RankingWeights';
import {
  DISCOVERY_RANKING_ALGORITHM_VERSION,
  DISCOVERY_RANKING_VERSION,
} from '../../domain/discovery/ranking/RankingVersion';
import { mapToEligibleCandidate } from '../../domain/discovery/eligibility/EligibilityMapper';
import { createDiscoverySDK } from '../discovery/createDiscoverySDK';
import { createDefaultRankingEngine } from '../discovery/ranking/DefaultRankingEngine';
import { DISCOVERY_RANKING_WEIGHTS } from '../discovery/ranking/RankingEngine';
import { createTenantDiscoveryRepositoryAdapter } from '../discovery/repository/adapters/TenantDiscoveryRepositoryAdapter';
import type { DiscoveryCandidate } from '../discovery/dto/candidates';
import type { EligibleCandidate } from '../discovery/dto/eligibleCandidate';
import { sdkOk } from '../core/resultHelpers';
import type { TenantReadRecord, TenantRepositoryPort } from '../discovery/repository/ports/TenantRepositoryPort';

const BRANCH_POINT = { lat: 18.5204, lng: 73.8567 };
const NEAR_CUSTOMER = { lat: 18.521, lng: 73.857 };

const baseCandidate = (overrides: Partial<DiscoveryCandidate> = {}): DiscoveryCandidate => ({
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
  ...overrides,
});

const eligibleFrom = (
  candidate: DiscoveryCandidate,
  customerPoint = NEAR_CUSTOMER
): EligibleCandidate => mapToEligibleCandidate(candidate, customerPoint);

describe('RankingWeights (M3 PR-5)', () => {
  it('active weights sum to 1.0', () => {
    assert.equal(validateRankingWeights(), true);
    assert.equal(sumActiveRankingWeights(), 1);
    assert.equal(DISCOVERY_RANKING_WEIGHTS.promoted, 0);
    assert.equal(DISCOVERY_RANKING_WEIGHTS.aiRecommendation, 0);
  });
});

describe('RankingMapper (M3 PR-5)', () => {
  const query = { customerPoint: NEAR_CUSTOMER };

  it('ranks nearer candidate ahead under distance-only policy', () => {
    const near = eligibleFrom(
      baseCandidate({ tenantId: 'tenant-near', branchId: 'tenant-near' })
    );
    const far = eligibleFrom(
      baseCandidate({
        tenantId: 'tenant-far',
        branchId: 'tenant-far',
        point: { lat: 18.535, lng: 73.87 },
      })
    );

    assert.equal(far.isEligible, true);
    assert.equal(near.isEligible, true);
    assert.ok(far.distanceKm > near.distanceKm);

    const ranked = rankEligibleCandidates([far, near], query, false);
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0]?.candidate.candidate.tenantId, 'tenant-near');
    assert.equal(ranked[0]?.breakdown.policy, 'distance-only-v1');
    assert.equal(ranked[0]?.breakdown.rank, 1);
    assert.ok(ranked[0]!.score >= ranked[1]!.score);
  });

  it('uses weighted policy when enabled', () => {
    const lowRatingNear = eligibleFrom(
      baseCandidate({
        tenantId: 'tenant-low-rating',
        branchId: 'tenant-low-rating',
        rating: 2,
        prepTimeMins: 45,
      })
    );
    const highRatingFar = eligibleFrom(
      baseCandidate({
        tenantId: 'tenant-high-rating',
        branchId: 'tenant-high-rating',
        point: { lat: 18.53, lng: 73.88 },
        rating: 5,
        prepTimeMins: 15,
      })
    );

    const ranked = rankEligibleCandidates([lowRatingNear, highRatingFar], query, true);
    assert.equal(ranked[0]?.breakdown.policy, 'weighted-v1');
    assert.equal(ranked[0]?.breakdown.factors.length, 8);
  });

  it('breaks ties deterministically by tenantId', () => {
    const sharedDistance = eligibleFrom(
      baseCandidate({ tenantId: 'tenant-b', branchId: 'tenant-b' })
    );
    const sharedDistanceB = eligibleFrom(
      baseCandidate({ tenantId: 'tenant-a', branchId: 'tenant-a' })
    );

    const firstPass = rankEligibleCandidates([sharedDistance, sharedDistanceB], query, false);
    const secondPass = rankEligibleCandidates([sharedDistanceB, sharedDistance], query, false);

    assert.deepEqual(
      firstPass.map((entry) => entry.candidate.candidate.tenantId),
      secondPass.map((entry) => entry.candidate.candidate.tenantId)
    );
  });

  it('preserves stable ordering for equal scores', () => {
    const engine = createDiscoveryRankingEngine();
    const entries = [
      eligibleFrom(baseCandidate({ tenantId: 'tenant-z', branchId: 'tenant-z' })),
      eligibleFrom(baseCandidate({ tenantId: 'tenant-y', branchId: 'tenant-y' })),
    ];

    const ranked = engine.rank(entries, query, false);
    assert.equal(ranked[0]?.candidate.candidate.tenantId, 'tenant-y');
    assert.equal(ranked[1]?.candidate.candidate.tenantId, 'tenant-z');
  });

  it('excludes ineligible candidates from ranked output', () => {
    const eligible = eligibleFrom(baseCandidate());
    const ineligible = {
      ...eligibleFrom(baseCandidate({ tenantId: 'tenant-closed', branchId: 'tenant-closed' })),
      isEligible: false,
    };

    const ranked = rankEligibleCandidates([eligible, ineligible], query, false);
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0]?.candidate.candidate.tenantId, 'tenant-a');
  });

  it('includes explainable reasons and version metadata', () => {
    const ranked = rankEligibleCandidates([eligibleFrom(baseCandidate())], query, true);
    const top = ranked[0];
    assert.ok(top);
    assert.ok(top.reasons.length > 0);
    assert.equal(top.algorithmVersion, DISCOVERY_RANKING_ALGORITHM_VERSION);
    assert.equal(top.rankingVersion, DISCOVERY_RANKING_VERSION);
    assert.equal(top.breakdown.rank, 1);
    assert.ok(top.score > 0);
  });
});

describe('DefaultRankingEngine SDK adapter (M3 PR-5)', () => {
  it('returns SdkResult ranked candidates', () => {
    const engine = createDefaultRankingEngine();
    const result = engine.rank([eligibleFrom(baseCandidate())], {
      query: { customerPoint: NEAR_CUSTOMER },
      useWeightedRanking: true,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.length, 1);
      assert.equal(result.value[0]?.breakdown.policy, 'weighted-v1');
    }
  });
});

describe('DefaultDiscoveryAdapter ranking wiring (M3 PR-5)', () => {
  const ACTIVE_TENANT: TenantReadRecord = {
    id: 'tenant-kitchen-a',
    slug: 'spice-kitchen',
    name: 'Spice Kitchen',
    status: 'active',
    storeStatus: 'published',
    location: { lat: 18.5204, lng: 73.8567, geohash: 'tdr1w' },
    deliveryConfig: { maxRadius: 5, prepTime: 25 },
    storeOperations: { isStoreOpen: true },
  };

  const tenantPort = (tenants: TenantReadRecord[]): TenantRepositoryPort => ({
    listActiveTenants: async () => sdkOk(tenants),
    getTenantsByIds: async (ids) => {
      const idSet = new Set(ids);
      return sdkOk(tenants.filter((tenant) => idSet.has(tenant.id)));
    },
  });

  it('rankCandidates uses distance-only when ranking flag is off', async () => {
    const sdk = createDiscoverySDK({
      repository: createTenantDiscoveryRepositoryAdapter(tenantPort([ACTIVE_TENANT])),
      featureFlags: (flag) => flag === 'FF_DISCOVERY_ELIGIBILITY_ENABLED',
    });

    const candidates = await sdk.getDiscoveryCandidates({ customerPoint: NEAR_CUSTOMER });
    assert.equal(candidates.ok, true);
    if (!candidates.ok) return;

    const eligibility = await sdk.calculateEligibility(candidates.value[0]!, NEAR_CUSTOMER);
    assert.equal(eligibility.ok, true);
    if (!eligibility.ok) return;

    const eligible = [
      mapToEligibleCandidate(candidates.value[0]!, NEAR_CUSTOMER),
    ];

    const ranked = await sdk.rankCandidates(eligible, {
      query: { customerPoint: NEAR_CUSTOMER },
      useWeightedRanking: false,
    });

    assert.equal(ranked.ok, true);
    if (ranked.ok) {
      assert.equal(ranked.value[0]?.breakdown.policy, 'distance-only-v1');
    }
  });

  it('rankCandidates uses weighted policy when ranking flag is on', async () => {
    const sdk = createDiscoverySDK({
      repository: createTenantDiscoveryRepositoryAdapter(tenantPort([ACTIVE_TENANT])),
      featureFlags: (flag) =>
        flag === 'FF_DISCOVERY_ELIGIBILITY_ENABLED' || flag === 'FF_DISCOVERY_RANKING_ENABLED',
    });

    const eligible = [mapToEligibleCandidate(baseCandidate(), NEAR_CUSTOMER)];
    const ranked = await sdk.rankCandidates(eligible, {
      query: { customerPoint: NEAR_CUSTOMER, cuisineTags: ['south-indian'] },
      useWeightedRanking: true,
    });

    assert.equal(ranked.ok, true);
    if (ranked.ok) {
      assert.equal(ranked.value[0]?.breakdown.policy, 'weighted-v1');
      assert.equal(ranked.value[0]?.breakdown.factors.length, 8);
    }
  });
});

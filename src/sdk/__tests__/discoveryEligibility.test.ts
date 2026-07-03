import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateDeliveryDistanceKm } from '../../lib/deliveryFee';
import { createDiscoveryEligibilityEngine } from '../../domain/discovery/eligibility/EligibilityEngine';
import { calculateDiscoveryDistanceKm } from '../../domain/discovery/eligibility/DistanceCalculator';
import { mapToEligibleCandidate } from '../../domain/discovery/eligibility/EligibilityMapper';
import { createDiscoverySDK } from '../discovery/createDiscoverySDK';
import { createDefaultEligibilityEngine } from '../discovery/eligibility/DefaultEligibilityEngine';
import { createTenantDiscoveryRepositoryAdapter } from '../discovery/repository/adapters/TenantDiscoveryRepositoryAdapter';
import type { DiscoveryCandidate } from '../discovery/dto/candidates';
import { sdkOk } from '../core/resultHelpers';
import type { TenantReadRecord, TenantRepositoryPort } from '../discovery/repository/ports/TenantRepositoryPort';

const BRANCH_POINT = { lat: 18.5204, lng: 73.8567 };
const NEAR_CUSTOMER = { lat: 18.521, lng: 73.857 };
const FAR_CUSTOMER = { lat: 19.2, lng: 74.5 };

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

describe('DistanceCalculator (M3 PR-4)', () => {
  it('matches deliveryFee.ts road-factor distance', () => {
    const discoveryKm = calculateDiscoveryDistanceKm(NEAR_CUSTOMER, BRANCH_POINT);
    const legacyKm = calculateDeliveryDistanceKm(
      NEAR_CUSTOMER.lat,
      NEAR_CUSTOMER.lng,
      BRANCH_POINT.lat,
      BRANCH_POINT.lng
    );
    assert.ok(Math.abs(discoveryKm - legacyKm) < 0.0001);
  });
});

describe('EligibilityMapper (M3 PR-4)', () => {
  const engine = createDiscoveryEligibilityEngine();

  it('marks candidate inside delivery radius as eligible', () => {
    const result = mapToEligibleCandidate(baseCandidate(), NEAR_CUSTOMER);
    assert.equal(result.isEligible, true);
    assert.equal(result.eligibility.status, 'serviceable');
    assert.ok(result.distanceKm > 0);
    assert.ok(result.distanceKm < 5);
  });

  it('marks candidate outside delivery radius as ineligible', () => {
    const result = mapToEligibleCandidate(baseCandidate(), FAR_CUSTOMER);
    assert.equal(result.isEligible, false);
    assert.equal(result.eligibility.status, 'out_of_radius');
    const radiusRule = result.reasons.find((reason) => reason.rule === 'inside_delivery_radius');
    assert.equal(radiusRule?.passed, false);
  });

  it('rejects closed kitchen', () => {
    const result = mapToEligibleCandidate(baseCandidate({ isOpen: false }), NEAR_CUSTOMER);
    assert.equal(result.isEligible, false);
    assert.equal(result.eligibility.status, 'closed');
  });

  it('rejects inactive tenant', () => {
    const result = mapToEligibleCandidate(baseCandidate({ status: 'suspended' }), NEAR_CUSTOMER);
    assert.equal(result.isEligible, false);
    assert.equal(result.eligibility.status, 'unavailable');
    const activeRule = result.reasons.find((reason) => reason.rule === 'branch_active');
    assert.equal(activeRule?.passed, false);
  });

  it('rejects missing branch coordinates', () => {
    const result = mapToEligibleCandidate(
      baseCandidate({ point: { lat: 0, lng: 0 } }),
      NEAR_CUSTOMER
    );
    assert.equal(result.isEligible, false);
    const coordRule = result.reasons.find((reason) => reason.rule === 'valid_coordinates');
    assert.equal(coordRule?.passed, false);
  });

  it('rejects invalid delivery radius', () => {
    const zeroRadius = mapToEligibleCandidate(baseCandidate({ maxRadiusKm: 0 }), NEAR_CUSTOMER);
    assert.equal(zeroRadius.isEligible, false);
    const configRule = zeroRadius.reasons.find((reason) => reason.rule === 'delivery_config_valid');
    assert.equal(configRule?.passed, false);

    const missingRadius = mapToEligibleCandidate(
      baseCandidate({ maxRadiusKm: undefined }),
      NEAR_CUSTOMER
    );
    assert.equal(missingRadius.isEligible, false);
  });

  it('evaluates batch without sorting or ranking', () => {
    const candidates = [
      baseCandidate({ tenantId: 'tenant-far', branchId: 'tenant-far' }),
      baseCandidate({ tenantId: 'tenant-near', branchId: 'tenant-near', isOpen: false }),
    ];
    const evaluated = engine.evaluateCandidates(candidates, NEAR_CUSTOMER);
    assert.equal(evaluated.length, 2);
    assert.equal(evaluated[0]?.candidate.tenantId, 'tenant-far');
    assert.equal(evaluated[1]?.candidate.tenantId, 'tenant-near');
    assert.equal(engine.filterEligible(evaluated).length, 1);
  });
});

describe('DefaultEligibilityEngine SDK adapter (M3 PR-4)', () => {
  it('returns SdkResult with eligibility reasons', () => {
    const engine = createDefaultEligibilityEngine();
    const result = engine.evaluateCandidate(baseCandidate(), NEAR_CUSTOMER);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.isEligible, true);
      assert.equal(result.value.reasons.length, 6);
    }
  });
});

describe('DefaultDiscoveryAdapter eligibility wiring (M3 PR-4)', () => {
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

  it('calculateEligibility is NOT_CONFIGURED when flag is off', async () => {
    const sdk = createDiscoverySDK({
      repository: createTenantDiscoveryRepositoryAdapter(tenantPort([ACTIVE_TENANT])),
    });

    const candidates = await sdk.getDiscoveryCandidates({ customerPoint: NEAR_CUSTOMER });
    assert.equal(candidates.ok, true);
    if (!candidates.ok) return;

    const eligibility = await sdk.calculateEligibility(candidates.value[0]!, NEAR_CUSTOMER);
    assert.equal(eligibility.ok, false);
    if (!eligibility.ok) {
      assert.equal(eligibility.error.code, 'NOT_CONFIGURED');
    }
  });

  it('calculateEligibility succeeds when eligibility flag is on', async () => {
    const sdk = createDiscoverySDK({
      repository: createTenantDiscoveryRepositoryAdapter(tenantPort([ACTIVE_TENANT])),
      featureFlags: (flag) => flag === 'FF_DISCOVERY_ELIGIBILITY_ENABLED',
    });

    const candidates = await sdk.getDiscoveryCandidates({ customerPoint: NEAR_CUSTOMER });
    assert.equal(candidates.ok, true);
    if (!candidates.ok) return;

    const eligibility = await sdk.calculateEligibility(candidates.value[0]!, NEAR_CUSTOMER);
    assert.equal(eligibility.ok, true);
    if (eligibility.ok) {
      assert.equal(eligibility.value.isServiceable, true);
      assert.equal(eligibility.value.status, 'serviceable');
    }
  });

  it('calculateDistance is available when eligibility engine is configured', async () => {
    const sdk = createDiscoverySDK({
      repository: createTenantDiscoveryRepositoryAdapter(tenantPort([ACTIVE_TENANT])),
      eligibilityEngine: createDefaultEligibilityEngine(),
    });

    const distance = await sdk.calculateDistance(NEAR_CUSTOMER, BRANCH_POINT);
    assert.equal(distance.ok, true);
    if (distance.ok) {
      assert.ok(distance.value > 0);
    }
  });
});

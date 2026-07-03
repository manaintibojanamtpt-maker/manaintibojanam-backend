import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../core/resultHelpers';
import { createDiscoverySDK } from '../discovery/createDiscoverySDK';
import {
  mapTenantToDiscoveryCandidate,
  mapTenantsToDiscoveryCandidates,
} from '../discovery/repository/mappers/DiscoveryCandidateMapper';
import { createTenantDiscoveryRepositoryAdapter } from '../discovery/repository/adapters/TenantDiscoveryRepositoryAdapter';
import type { TenantReadRecord, TenantRepositoryPort } from '../discovery/repository/ports/TenantRepositoryPort';

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

const INACTIVE_TENANT: TenantReadRecord = {
  id: 'tenant-closed',
  status: 'suspended',
  location: { lat: 18.5, lng: 73.8, geohash: 'tdr1x' },
};

const NO_LOCATION_TENANT: TenantReadRecord = {
  id: 'tenant-no-location',
  status: 'active',
};

const createTenantPort = (tenants: TenantReadRecord[]): TenantRepositoryPort => ({
  listActiveTenants: async () => sdkOk(tenants),
  getTenantsByIds: async (ids) => {
    const idSet = new Set(ids);
    return sdkOk(tenants.filter((tenant) => idSet.has(tenant.id)));
  },
});

describe('DiscoveryCandidateMapper (M3 PR-3)', () => {
  it('maps active tenant to tenant-as-branch candidate', () => {
    const candidate = mapTenantToDiscoveryCandidate(ACTIVE_TENANT);
    assert.ok(candidate);
    assert.equal(candidate.tenantId, 'tenant-kitchen-a');
    assert.equal(candidate.branchId, 'tenant-kitchen-a');
    assert.equal(candidate.slug, 'spice-kitchen');
    assert.equal(candidate.geohash, 'tdr1w');
    assert.equal(candidate.maxRadiusKm, 5);
    assert.equal(candidate.distanceKm, undefined);
  });

  it('skips inactive tenants and tenants without coordinates', () => {
    const mapped = mapTenantsToDiscoveryCandidates([
      ACTIVE_TENANT,
      INACTIVE_TENANT,
      NO_LOCATION_TENANT,
    ]);
    assert.equal(mapped.length, 1);
    assert.equal(mapped[0]?.tenantId, 'tenant-kitchen-a');
  });

  it('encodes geohash when tenant has coordinates but no stored geohash', () => {
    const candidate = mapTenantToDiscoveryCandidate({
      ...ACTIVE_TENANT,
      id: 'tenant-encoded',
      location: { lat: 18.5204, lng: 73.8567 },
    });
    assert.ok(candidate?.geohash);
    assert.equal(candidate?.geohash.length, 7);
  });
});

describe('TenantDiscoveryRepositoryAdapter (M3 PR-3)', () => {
  it('getDiscoveryCandidates returns mapped active tenants only', async () => {
    const repository = createTenantDiscoveryRepositoryAdapter(
      createTenantPort([ACTIVE_TENANT, INACTIVE_TENANT, NO_LOCATION_TENANT])
    );

    const result = await repository.getDiscoveryCandidates({
      customerPoint: { lat: 18.52, lng: 73.85 },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 1);
    assert.equal(result.value[0]?.name, 'Spice Kitchen');
  });

  it('findNearbyBranches scopes by tenantId without distance filtering', async () => {
    const otherTenant: TenantReadRecord = {
      ...ACTIVE_TENANT,
      id: 'tenant-kitchen-b',
      slug: 'other-kitchen',
      name: 'Other Kitchen',
    };
    const repository = createTenantDiscoveryRepositoryAdapter(
      createTenantPort([ACTIVE_TENANT, otherTenant])
    );

    const result = await repository.findNearbyBranches({
      tenantId: 'tenant-kitchen-b' as never,
      customerPoint: { lat: 18.52, lng: 73.85 },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 1);
    assert.equal(result.value[0]?.tenantId, 'tenant-kitchen-b');
  });

  it('searchByCuisine remains NOT_CONFIGURED', async () => {
    const repository = createTenantDiscoveryRepositoryAdapter(createTenantPort([ACTIVE_TENANT]));
    const result = await repository.searchByCuisine({
      query: { customerPoint: { lat: 1, lng: 2 } },
      cuisineTags: ['biryani'],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });
});

describe('DiscoverySDK tenant repository wiring (M3 PR-3)', () => {
  it('createDiscoverySDK({ providerKind: tenant-scan }) exposes getDiscoveryCandidates', async () => {
    const sdk = createDiscoverySDK({
      providerKind: 'tenant-scan',
      repository: createTenantDiscoveryRepositoryAdapter(createTenantPort([ACTIVE_TENANT])),
    });

    const result = await sdk.getDiscoveryCandidates({
      customerPoint: { lat: 18.52, lng: 73.85 },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value[0]?.slug, 'spice-kitchen');
  });

  it('discoverNearby runs pipeline when repository and engines are configured', async () => {
    const sdk = createDiscoverySDK({
      providerKind: 'tenant-scan',
      repository: createTenantDiscoveryRepositoryAdapter(createTenantPort([ACTIVE_TENANT])),
      featureFlags: (flag) => flag === 'FF_DISCOVERY_ELIGIBILITY_ENABLED',
    });

    const result = await sdk.discoverNearby({
      customerPoint: { lat: 18.52, lng: 73.85 },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants[0]?.slug, 'spice-kitchen');
    assert.ok(result.value.telemetry);
  });
});

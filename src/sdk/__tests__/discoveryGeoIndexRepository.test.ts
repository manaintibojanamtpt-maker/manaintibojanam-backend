import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../core/resultHelpers';
import { createDiscoverySDK } from '../discovery/createDiscoverySDK';
import { toGeohashPrefix } from '../discovery/repository/GeoHashPrefixResolver';
import {
  buildExpansionPrefixPlan,
  buildGeoIndexPrefixPlan,
} from '../discovery/repository/GeoIndexStrategy';
import {
  dedupeGeoIndexEntries,
  extractTenantIdsFromGeoIndex,
  mapTenantsToStableDiscoveryCandidates,
} from '../discovery/repository/GeoIndexMapper';
import { createDefaultGeoIndexRepository } from '../discovery/repository/createGeoIndexRepository';
import { createDiscoveryRepository } from '../discovery/repository/createDiscoveryRepository';
import { createTenantDiscoveryRepositoryAdapter } from '../discovery/repository/adapters/TenantDiscoveryRepositoryAdapter';
import type { GeoIndexPort, GeoIndexReadRecord } from '../discovery/repository/GeoIndexPort';
import type { GeoIndexRepositoryTelemetry } from '../discovery/repository/GeoIndexRepository';
import type { TenantReadRecord, TenantRepositoryPort } from '../discovery/repository/ports/TenantRepositoryPort';

const CUSTOMER_POINT = { lat: 18.521, lng: 73.857 };
const CUSTOMER_GEOHASH = 'tdr1w7n';

const ACTIVE_TENANT: TenantReadRecord = {
  id: 'tenant-kitchen-a',
  slug: 'spice-kitchen',
  name: 'Spice Kitchen',
  status: 'active',
  storeStatus: 'published',
  location: { lat: 18.5204, lng: 73.8567, geohash: CUSTOMER_GEOHASH },
  deliveryConfig: { maxRadius: 5, prepTime: 25 },
  storeOperations: { isStoreOpen: true },
};

const OTHER_TENANT: TenantReadRecord = {
  ...ACTIVE_TENANT,
  id: 'tenant-kitchen-b',
  slug: 'other-kitchen',
  name: 'Other Kitchen',
};

const createTenantPort = (tenants: TenantReadRecord[]): TenantRepositoryPort => ({
  listActiveTenants: async () => sdkOk(tenants),
  getTenantsByIds: async (ids) => {
    const idSet = new Set(ids);
    return sdkOk(tenants.filter((tenant) => idSet.has(tenant.id)));
  },
});

const createGeoIndexPort = (
  entriesByPrefix: Record<string, GeoIndexReadRecord[]>
): GeoIndexPort => ({
  queryByPrefixes: async (prefixes) => {
    const matches = prefixes.flatMap((prefix) => entriesByPrefix[prefix] ?? []);
    return sdkOk(dedupeGeoIndexEntries(matches));
  },
});

describe('GeoHashPrefixResolver (M3 PR-7)', () => {
  it('builds precision-6 prefix by default', () => {
    assert.equal(toGeohashPrefix(CUSTOMER_GEOHASH, 6), 'tdr1w7');
    assert.deepEqual(buildGeoIndexPrefixPlan(CUSTOMER_GEOHASH), ['tdr1w7', 'tdr1w']);
  });

  it('includes expansion precision plan separately', () => {
    assert.deepEqual(buildExpansionPrefixPlan(CUSTOMER_GEOHASH), ['tdr1w']);
  });
});

describe('GeoIndexMapper (M3 PR-7)', () => {
  it('deduplicates tenant IDs from multiple prefix matches', () => {
    const tenantIds = extractTenantIdsFromGeoIndex([
      {
        geohashPrefix: 'tdr1w7',
        geohash: CUSTOMER_GEOHASH,
        branchId: 'tenant-kitchen-a',
        tenantId: 'tenant-kitchen-a',
      },
      {
        geohashPrefix: 'tdr1w',
        geohash: CUSTOMER_GEOHASH,
        branchId: 'tenant-kitchen-a',
        tenantId: 'tenant-kitchen-a',
      },
      {
        geohashPrefix: 'tdr1w7',
        geohash: CUSTOMER_GEOHASH,
        branchId: 'tenant-kitchen-b',
        tenantId: 'tenant-kitchen-b',
      },
    ]);

    assert.deepEqual(tenantIds, ['tenant-kitchen-a', 'tenant-kitchen-b']);
  });

  it('returns stable sorted discovery candidates', () => {
    const candidates = mapTenantsToStableDiscoveryCandidates([OTHER_TENANT, ACTIVE_TENANT]);
    assert.equal(candidates[0]?.tenantId, 'tenant-kitchen-a');
    assert.equal(candidates[1]?.tenantId, 'tenant-kitchen-b');
  });
});

describe('DefaultGeoIndexRepository (M3 PR-7)', () => {
  it('returns geoIndex-backed candidates when enabled', async () => {
    const telemetry: GeoIndexRepositoryTelemetry[] = [];
    const repository = createDefaultGeoIndexRepository({
      geoIndexPort: createGeoIndexPort({
        tdr1w7: [
          {
            geohashPrefix: 'tdr1w7',
            geohash: CUSTOMER_GEOHASH,
            branchId: 'tenant-kitchen-a',
            tenantId: 'tenant-kitchen-a',
          },
        ],
      }),
      tenantRepository: createTenantPort([ACTIVE_TENANT, OTHER_TENANT]),
      hooks: {
        onTelemetry: (event) => telemetry.push(event),
      },
    });

    const result = await repository.getDiscoveryCandidates({
      customerPoint: CUSTOMER_POINT,
      customerGeohash: CUSTOMER_GEOHASH,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.candidates.length, 1);
    assert.equal(result.value.candidates[0]?.tenantId, 'tenant-kitchen-a');
    assert.equal(result.value.telemetry.fallbackUsed, false);
    assert.equal(result.value.telemetry.tenantIdsMatched, 1);
    assert.equal(telemetry.length, 1);
  });

  it('falls back to tenant scan when geoIndex is empty', async () => {
    const repository = createDefaultGeoIndexRepository({
      geoIndexPort: createGeoIndexPort({}),
      tenantRepository: createTenantPort([ACTIVE_TENANT, OTHER_TENANT]),
    });

    const result = await repository.getDiscoveryCandidates({
      customerPoint: CUSTOMER_POINT,
      customerGeohash: CUSTOMER_GEOHASH,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.telemetry.fallbackUsed, true);
    assert.equal(result.value.telemetry.fallbackReason, 'empty_geoindex');
    assert.equal(result.value.candidates.length, 2);
  });

  it('falls back when customer geohash is unknown', async () => {
    const repository = createDefaultGeoIndexRepository({
      geoIndexPort: createGeoIndexPort({
        tdr1w7: [
          {
            geohashPrefix: 'tdr1w7',
            geohash: CUSTOMER_GEOHASH,
            branchId: 'tenant-kitchen-a',
            tenantId: 'tenant-kitchen-a',
          },
        ],
      }),
      tenantRepository: createTenantPort([ACTIVE_TENANT]),
    });

    const result = await repository.getDiscoveryCandidates({
      customerPoint: { lat: Number.NaN, lng: Number.NaN },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.telemetry.fallbackReason, 'unknown_geohash');
    assert.equal(result.value.telemetry.fallbackUsed, true);
    assert.equal(result.value.candidates.length, 1);
  });

  it('queries expansion prefix when primary geoIndex is empty', async () => {
    const repository = createDefaultGeoIndexRepository({
      geoIndexPort: createGeoIndexPort({
        tdr1w: [
          {
            geohashPrefix: 'tdr1w',
            geohash: CUSTOMER_GEOHASH,
            branchId: 'tenant-kitchen-b',
            tenantId: 'tenant-kitchen-b',
          },
        ],
      }),
      tenantRepository: createTenantPort([ACTIVE_TENANT, OTHER_TENANT]),
    });

    const result = await repository.getDiscoveryCandidates({
      customerPoint: CUSTOMER_POINT,
      customerGeohash: CUSTOMER_GEOHASH,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.telemetry.fallbackUsed, false);
    assert.deepEqual(result.value.telemetry.prefixesQueried, ['tdr1w7', 'tdr1w']);
    assert.equal(result.value.candidates[0]?.tenantId, 'tenant-kitchen-b');
  });

  it('exposes geoIndex and tenant fetch timing telemetry', async () => {
    const repository = createDefaultGeoIndexRepository({
      geoIndexPort: createGeoIndexPort({
        tdr1w7: [
          {
            geohashPrefix: 'tdr1w7',
            geohash: CUSTOMER_GEOHASH,
            branchId: 'tenant-kitchen-a',
            tenantId: 'tenant-kitchen-a',
          },
        ],
      }),
      tenantRepository: createTenantPort([ACTIVE_TENANT]),
    });

    const result = await repository.getDiscoveryCandidates({
      customerPoint: CUSTOMER_POINT,
      customerGeohash: CUSTOMER_GEOHASH,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.ok(result.value.telemetry.geoIndexLookupMs >= 0);
    assert.ok(result.value.telemetry.tenantFetchMs >= 0);
    assert.equal(result.value.telemetry.returnedCount, 1);
  });
});

describe('createDiscoveryRepository geoIndex wiring (M3 PR-7)', () => {
  it('uses tenant scan when geoIndex flag is disabled', async () => {
    const tenantPort = createTenantPort([ACTIVE_TENANT, OTHER_TENANT]);
    const repository = createDiscoveryRepository({
      providerKind: 'tenant-scan',
      tenantRepository: tenantPort,
      geoIndexPort: createGeoIndexPort({
        tdr1w7: [
          {
            geohashPrefix: 'tdr1w7',
            geohash: CUSTOMER_GEOHASH,
            branchId: 'tenant-kitchen-a',
            tenantId: 'tenant-kitchen-a',
          },
        ],
      }),
      featureFlags: () => false,
    });

    const result = await repository.getDiscoveryCandidates({
      customerPoint: CUSTOMER_POINT,
      customerGeohash: CUSTOMER_GEOHASH,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 2);
  });

  it('uses geoIndex repository when flag is enabled', async () => {
    const telemetry: GeoIndexRepositoryTelemetry[] = [];
    const repository = createDiscoveryRepository({
      providerKind: 'tenant-scan',
      tenantRepository: createTenantPort([ACTIVE_TENANT, OTHER_TENANT]),
      geoIndexPort: createGeoIndexPort({
        tdr1w7: [
          {
            geohashPrefix: 'tdr1w7',
            geohash: CUSTOMER_GEOHASH,
            branchId: 'tenant-kitchen-a',
            tenantId: 'tenant-kitchen-a',
          },
        ],
      }),
      geoIndexHooks: {
        onTelemetry: (event) => telemetry.push(event),
      },
      featureFlags: (flag) => flag === 'FF_DISCOVERY_GEOINDEX_ENABLED',
    });

    const result = await repository.getDiscoveryCandidates({
      customerPoint: CUSTOMER_POINT,
      customerGeohash: CUSTOMER_GEOHASH,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 1);
    assert.equal(telemetry[0]?.fallbackUsed, false);
  });

  it('SDK factory preserves repository contract for pipeline', async () => {
    const sdk = createDiscoverySDK({
      providerKind: 'tenant-scan',
      repository: createDiscoveryRepository({
        providerKind: 'tenant-scan',
        tenantRepository: createTenantPort([ACTIVE_TENANT]),
        geoIndexPort: createGeoIndexPort({
          tdr1w7: [
            {
              geohashPrefix: 'tdr1w7',
              geohash: CUSTOMER_GEOHASH,
              branchId: 'tenant-kitchen-a',
              tenantId: 'tenant-kitchen-a',
            },
          ],
        }),
        featureFlags: (flag) => flag === 'FF_DISCOVERY_ELIGIBILITY_ENABLED',
      }),
      featureFlags: (flag) => flag === 'FF_DISCOVERY_ELIGIBILITY_ENABLED',
    });

    const result = await sdk.discoverNearby({
      customerPoint: CUSTOMER_POINT,
      customerGeohash: CUSTOMER_GEOHASH,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.restaurants.length, 1);
    assert.ok(result.value.telemetry);
  });
});

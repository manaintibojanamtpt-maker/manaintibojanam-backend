import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FirestoreSearchDocument, FirestoreSearchPort } from '../search/repository/FirestoreSearchPort';
import { mapFirestoreSearchDocument, isActiveSearchTenant } from '../search/repository/SearchFirestoreMapper';
import {
  mapRestaurantSearchHits,
  mapCuisineSearchHits,
  mapAreaSearchHits,
  sortSearchIndexHits,
} from '../search/repository/SearchIndexMapper';
import { createSearchRepository } from '../search/repository/SearchRepositoryFactory';
import { createStubSearchRepository } from '../search/repository/adapters/StubSearchRepository';
import type { SearchTenantReadRecord } from '../search/repository/SearchTenantReadRecord';

const ACTIVE_DOC: FirestoreSearchDocument = {
  id: 'tenant-spice',
  data: {
    slug: 'spice-kitchen',
    name: 'Spice Kitchen',
    status: 'active',
    cuisineTags: ['biryani', 'north-indian'],
    description: 'Famous biryani kitchen',
    location: {
      lat: 18.52,
      lng: 73.85,
      localityName: 'Koregaon Park',
      cityName: 'Pune',
      pincode: '411001',
      districtName: 'Pune',
      localityCode: 'KP01',
    },
  },
};

const INACTIVE_DOC: FirestoreSearchDocument = {
  id: 'tenant-closed',
  data: {
    name: 'Closed Kitchen',
    status: 'suspended',
    location: { cityName: 'Pune', pincode: '411001' },
  },
};

const OTHER_ACTIVE_DOC: FirestoreSearchDocument = {
  id: 'tenant-meghana',
  data: {
    slug: 'meghana-foods',
    name: 'Meghana Foods',
    status: 'active',
    cuisineTags: ['south-indian'],
    location: {
      localityName: 'Baner',
      cityName: 'Pune',
      pincode: '411045',
    },
  },
};

const toRecord = (doc: FirestoreSearchDocument): SearchTenantReadRecord =>
  mapFirestoreSearchDocument(doc);

const createMockPort = (documents: FirestoreSearchDocument[]): FirestoreSearchPort => ({
  fetchTenantDocuments: async () => documents,
});

describe('SearchFirestoreMapper (M4 PR-3)', () => {
  it('maps firestore tenant with area metadata', () => {
    const tenant = toRecord(ACTIVE_DOC);
    assert.equal(tenant.name, 'Spice Kitchen');
    assert.equal(tenant.location?.localityName, 'Koregaon Park');
    assert.equal(tenant.location?.pincode, '411001');
    assert.equal(tenant.location?.areaCode, 'KP01');
  });

  it('excludes inactive tenants', () => {
    assert.equal(isActiveSearchTenant(toRecord(ACTIVE_DOC)), true);
    assert.equal(isActiveSearchTenant(toRecord(INACTIVE_DOC)), false);
  });
});

describe('SearchIndexMapper (M4 PR-3)', () => {
  const activeTenants = [toRecord(ACTIVE_DOC), toRecord(OTHER_ACTIVE_DOC)];

  it('matches restaurant name with deterministic ordering', () => {
    const hits = mapRestaurantSearchHits(activeTenants, { text: 'meghana' });
    assert.equal(hits.length, 1);
    assert.equal(String(hits[0]?.tenantId), 'tenant-meghana');
    assert.equal(hits[0]?.matchType, 'prefix');
  });

  it('matches cuisine tags with any mode', () => {
    const hits = mapCuisineSearchHits(activeTenants, {
      tags: ['biryani'],
      matchMode: 'any',
    });
    assert.equal(hits.length, 1);
    assert.equal(String(hits[0]?.tenantId), 'tenant-spice');
  });

  it('matches area locality and pincode', () => {
    const localityHits = mapAreaSearchHits(activeTenants, { localityName: 'Koregaon Park' });
    assert.equal(localityHits.length, 1);
    assert.equal(String(localityHits[0]?.tenantId), 'tenant-spice');

    const pincodeHits = mapAreaSearchHits(activeTenants, { pincode: '411045' });
    assert.equal(pincodeHits.length, 1);
    assert.equal(String(pincodeHits[0]?.tenantId), 'tenant-meghana');
  });

  it('sorts by score desc then tenantId asc', () => {
    const sorted = sortSearchIndexHits([
      {
        tenantId: 'tenant-b' as never,
        branchId: 'tenant-b' as never,
        matchType: 'contains',
        field: 'name',
        score: 0.65,
      },
      {
        tenantId: 'tenant-a' as never,
        branchId: 'tenant-a' as never,
        matchType: 'exact',
        field: 'name',
        score: 1,
      },
      {
        tenantId: 'tenant-c' as never,
        branchId: 'tenant-c' as never,
        matchType: 'contains',
        field: 'name',
        score: 0.65,
      },
    ]);

    assert.equal(String(sorted[0]?.tenantId), 'tenant-a');
    assert.equal(String(sorted[1]?.tenantId), 'tenant-b');
    assert.equal(String(sorted[2]?.tenantId), 'tenant-c');
  });
});

describe('SearchRepositoryFactory (M4 PR-3)', () => {
  it('returns stub when repository flag is off', () => {
    const repository = createSearchRepository({
      firestoreSearchPort: createMockPort([ACTIVE_DOC]),
      featureFlags: () => false,
    });

    assert.equal(repository.constructor.name, 'StubSearchRepository');
  });

  it('returns firestore adapter when flag is on and port is provided', async () => {
    const repository = createSearchRepository({
      firestoreSearchPort: createMockPort([ACTIVE_DOC, INACTIVE_DOC, OTHER_ACTIVE_DOC]),
      featureFlags: (flag) => flag === 'FF_SEARCH_REPOSITORY_ENABLED',
    });

    const result = await repository.searchRestaurants({ text: 'Spice' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 1);
    assert.equal(String(result.value[0]?.tenantId), 'tenant-spice');
  });

  it('excludes inactive restaurants from repository search', async () => {
    const repository = createSearchRepository({
      firestoreSearchPort: createMockPort([INACTIVE_DOC]),
      featureFlags: (flag) => flag === 'FF_SEARCH_REPOSITORY_ENABLED',
    });

    const result = await repository.searchArea({ cityName: 'Pune' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 0);
  });

  it('stub searchRestaurants returns NOT_CONFIGURED', async () => {
    const repository = createStubSearchRepository();
    const result = await repository.searchRestaurants({ text: 'biryani' });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('food search remains NOT_CONFIGURED on firestore adapter', async () => {
    const repository = createSearchRepository({
      firestoreSearchPort: createMockPort([ACTIVE_DOC]),
      featureFlags: (flag) => flag === 'FF_SEARCH_REPOSITORY_ENABLED',
    });

    const result = await repository.searchFood({ text: 'biryani' });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });
});

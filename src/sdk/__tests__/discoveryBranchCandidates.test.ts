import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../core/resultHelpers';
import type { TenantId } from '../core/types';
import type { BranchId } from '../discovery/types/branded';
import {
  mapBranchToDiscoveryCandidate,
  mapBranchesToDiscoveryCandidates,
  sortDiscoveryCandidatesDeterministic,
} from '../discovery/branch/BranchCandidateMapper';
import {
  resolveDiscoveryBranchCandidates,
  resolveTenantAsBranchCandidates,
} from '../discovery/branch/BranchCandidateResolver';
import type {
  BranchDiscoveryReadPort,
  DiscoveryBranchReadRecord,
} from '../discovery/branch/BranchCandidateTypes';
import type { BranchCandidateTelemetryEvent } from '../discovery/branch/BranchCandidateTelemetry';
import { createTenantDiscoveryRepositoryAdapter } from '../discovery/repository/adapters/TenantDiscoveryRepositoryAdapter';
import type { TenantReadRecord, TenantRepositoryPort } from '../discovery/repository/ports/TenantRepositoryPort';

const TENANT_ID = 'paradise' as TenantId;

const ACTIVE_TENANT: TenantReadRecord = {
  id: 'paradise',
  slug: 'paradise-biryani',
  name: 'Paradise Biryani',
  status: 'active',
  storeStatus: 'published',
  location: { lat: 17.44, lng: 78.38, geohash: 'tepg9' },
  deliveryConfig: { maxRadius: 8, prepTime: 20 },
  storeOperations: { isStoreOpen: true },
  cuisineTags: ['biryani'],
  ratingAggregate: 4.6,
};

const BRANCH_HITECH: DiscoveryBranchReadRecord = {
  branchId: 'paradise-hitech',
  tenantId: 'paradise',
  name: 'Hitech City',
  slug: 'hitech-city',
  status: 'active',
  isDefault: true,
  location: { lat: 17.441, lng: 78.381, geohash: 'tepg9b' },
  maxRadiusKm: 8,
  prepTimeMins: 18,
  isOpen: true,
  rating: 4.7,
};

const BRANCH_BANJARA: DiscoveryBranchReadRecord = {
  branchId: 'paradise-banjara',
  tenantId: 'paradise',
  name: 'Banjara Hills',
  slug: 'banjara-hills',
  status: 'active',
  isDefault: false,
  location: { lat: 17.42, lng: 78.45, geohash: 'tepg8c' },
  maxRadiusKm: 6,
  prepTimeMins: 22,
  isOpen: true,
};

const BRANCH_SUSPENDED: DiscoveryBranchReadRecord = {
  ...BRANCH_BANJARA,
  branchId: 'paradise-closed',
  status: 'suspended',
};

const createTenantPort = (tenants: TenantReadRecord[]): TenantRepositoryPort => ({
  listActiveTenants: async () => sdkOk(tenants),
  getTenantsByIds: async (ids) => {
    const idSet = new Set(ids);
    return sdkOk(tenants.filter((tenant) => idSet.has(tenant.id)));
  },
});

const createBranchPort = (
  branches: DiscoveryBranchReadRecord[]
): BranchDiscoveryReadPort => ({
  listActiveBranchesByTenantIds: async () => sdkOk(branches),
});

describe('Discovery branch candidates (M5 PR-6)', () => {
  it('preserves tenant-as-branch behaviour when flag is off', async () => {
    const result = await resolveDiscoveryBranchCandidates({
      tenants: [ACTIVE_TENANT],
      branchDiscoveryEnabled: false,
      branchReadPort: createBranchPort([BRANCH_HITECH, BRANCH_BANJARA]),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.usedTenantAsBranch, true);
    assert.equal(result.value.candidates.length, 1);
    assert.equal(String(result.value.candidates[0]?.branchId), 'paradise');
    assert.equal(String(result.value.candidates[0]?.tenantId), 'paradise');
  });

  it('expands one brand into multiple branch candidates when flag is on', async () => {
    const result = await resolveDiscoveryBranchCandidates({
      tenants: [ACTIVE_TENANT],
      branchDiscoveryEnabled: true,
      branchReadPort: createBranchPort([BRANCH_BANJARA, BRANCH_HITECH]),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.candidates.length, 2);
    assert.equal(result.value.expandedTenantCount, 1);
    assert.equal(String(result.value.candidates[0]?.branchId), 'paradise-banjara');
    assert.equal(String(result.value.candidates[1]?.branchId), 'paradise-hitech');
  });

  it('maps branch candidates with brand-enriched display names', () => {
    const candidate = mapBranchToDiscoveryCandidate(BRANCH_HITECH, ACTIVE_TENANT);
    assert.ok(candidate);
    assert.equal(candidate?.name, 'Paradise Biryani — Hitech City');
    assert.equal(String(candidate?.tenantId), 'paradise');
    assert.equal(String(candidate?.branchId), 'paradise-hitech');
  });

  it('excludes inactive branch records', () => {
    const mapped = mapBranchesToDiscoveryCandidates(
      [BRANCH_HITECH, BRANCH_SUSPENDED],
      ACTIVE_TENANT
    );
    assert.equal(mapped.length, 1);
    assert.equal(String(mapped[0]?.branchId), 'paradise-hitech');
  });

  it('falls back to tenant-as-branch when branch collection is empty', async () => {
    const result = await resolveDiscoveryBranchCandidates({
      tenants: [ACTIVE_TENANT],
      branchDiscoveryEnabled: true,
      branchReadPort: createBranchPort([]),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.fallbackTenantCount, 1);
    assert.equal(String(result.value.candidates[0]?.branchId), 'paradise');
  });

  it('sorts candidates deterministically by tenantId then branchId', () => {
    const sorted = sortDiscoveryCandidatesDeterministic([
      {
        tenantId: 'tenant-b' as TenantId,
        branchId: 'branch-z' as BranchId,
        name: 'B Z',
        slug: 'b-z',
        point: { lat: 1, lng: 1 },
        geohash: 'abc1234' as never,
      },
      {
        tenantId: 'tenant-a' as TenantId,
        branchId: 'branch-m' as BranchId,
        name: 'A M',
        slug: 'a-m',
        point: { lat: 1, lng: 1 },
        geohash: 'abc1235' as never,
      },
      {
        tenantId: 'tenant-a' as TenantId,
        branchId: 'branch-a' as BranchId,
        name: 'A A',
        slug: 'a-a',
        point: { lat: 1, lng: 1 },
        geohash: 'abc1236' as never,
      },
    ]);

    assert.equal(String(sorted[0]?.tenantId), 'tenant-a');
    assert.equal(String(sorted[0]?.branchId), 'branch-a');
    assert.equal(String(sorted[1]?.branchId), 'branch-m');
    assert.equal(String(sorted[2]?.tenantId), 'tenant-b');
  });

  it('emits telemetry during multi-branch expansion', async () => {
    const events: BranchCandidateTelemetryEvent[] = [];

    await resolveDiscoveryBranchCandidates({
      tenants: [ACTIVE_TENANT],
      branchDiscoveryEnabled: true,
      branchReadPort: createBranchPort([BRANCH_HITECH]),
      onTelemetry: (event) => events.push(event),
    });

    assert.ok(events.some((event) => event.type === 'BRANCH_CANDIDATE_EXPANSION_START'));
    assert.ok(events.some((event) => event.type === 'BRANCH_CANDIDATE_EXPANSION_COMPLETE'));
  });

  it('resolveTenantAsBranchCandidates matches legacy mapper output', () => {
    const resolved = resolveTenantAsBranchCandidates([ACTIVE_TENANT]);
    assert.equal(resolved.candidates.length, 1);
    assert.equal(String(resolved.candidates[0]?.branchId), TENANT_ID);
  });

  it('repository adapter returns multi-branch candidates when flag is on', async () => {
    const repository = createTenantDiscoveryRepositoryAdapter(createTenantPort([ACTIVE_TENANT]), {
      branchDiscoveryEnabled: true,
      branchReadPort: createBranchPort([BRANCH_HITECH, BRANCH_BANJARA]),
    });

    const result = await repository.getDiscoveryCandidates({
      customerPoint: { lat: 17.44, lng: 78.38 },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 2);
  });

  it('repository adapter preserves single candidate when flag is off', async () => {
    const repository = createTenantDiscoveryRepositoryAdapter(createTenantPort([ACTIVE_TENANT]), {
      branchDiscoveryEnabled: false,
      branchReadPort: createBranchPort([BRANCH_HITECH, BRANCH_BANJARA]),
    });

    const result = await repository.getDiscoveryCandidates({
      customerPoint: { lat: 17.44, lng: 78.38 },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 1);
    assert.equal(String(result.value[0]?.branchId), 'paradise');
  });
});

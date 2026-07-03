import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TenantId } from '../core/types';
import type { BranchId } from '../branch/types/branded';
import type { BranchPersistencePort } from '../branch/repository/BranchRepositoryPorts';
import type {
  BranchCapacityDocumentRecord,
  BranchDocumentRecord,
  BranchHoursDocumentRecord,
  BranchInventoryDocumentRecord,
  BranchRoutingDocumentRecord,
  BranchStatusDocumentRecord,
} from '../branch/repository/BranchPersistenceModels';
import {
  filterBranchDocuments,
  isActiveBranchDocument,
  mapBranchCapacityDocument,
  mapBranchDocumentToDetail,
  mapBranchDocumentToSummary,
  mapBranchHoursDocument,
  mapBranchInventoryDocument,
  mapBranchRoutingDocument,
  mapBranchStatusDocument,
} from '../branch/repository/BranchRepositoryMapper';
import { createBranchRepository } from '../branch/repository/BranchRepositoryFactory';
import { createStubBranchRepository } from '../branch/repository/StubBranchRepository';
import { createBranchRepositoryAdapter } from '../branch/repository/BranchRepositoryAdapter';

const TENANT_ID = 'paradise' as TenantId;
const BRANCH_A = 'paradise-hitech' as BranchId;
const BRANCH_B = 'paradise-banjara' as BranchId;

const ACTIVE_BRANCH: BranchDocumentRecord = {
  id: 'paradise-hitech',
  tenantId: 'paradise',
  slug: 'hitech-city',
  name: 'Paradise — Hitech City',
  status: 'active',
  locationId: 'loc-hitech',
  deliveryConfigId: 'delivery-hitech',
  isDefault: true,
  geohash: 'tepg9',
  coordinates: { lat: 17.44, lng: 78.38 },
  formattedAddress: 'Hitech City, Hyderabad',
  schemaVersion: 1,
  updatedAt: 1_700_000_000_000,
};

const SUSPENDED_BRANCH: BranchDocumentRecord = {
  id: 'paradise-banjara',
  tenantId: 'paradise',
  slug: 'banjara-hills',
  name: 'Paradise — Banjara Hills',
  status: 'suspended',
  locationId: 'loc-banjara',
  isDefault: false,
  coordinates: { lat: 17.42, lng: 78.45 },
};

const CAPACITY_DOC: BranchCapacityDocumentRecord = {
  branchId: 'paradise-hitech',
  tenantId: 'paradise',
  activeOrders: 3,
  maxConcurrentOrders: 12,
  prepQueueMins: 15,
  congestionLevel: 'medium',
  acceptingOrders: true,
  updatedAt: 1_700_000_000_100,
};

const INVENTORY_DOC: BranchInventoryDocumentRecord = {
  branchId: 'paradise-hitech',
  tenantId: 'paradise',
  items: [
    { menuItemId: 'biryani-veg', isAvailable: true, quantity: 20 },
    { menuItemId: 'biryani-chicken', isAvailable: false, quantity: 0 },
  ],
  updatedAt: 1_700_000_000_200,
};

const HOURS_DOC: BranchHoursDocumentRecord = {
  branchId: 'paradise-hitech',
  tenantId: 'paradise',
  timezone: 'Asia/Kolkata',
  rules: [
    { dayOfWeek: 1, openTime: '09:00', closeTime: '23:00', isClosed: false },
  ],
  exceptions: [{ date: '2026-12-25', isClosed: true, label: 'Christmas' }],
};

const STATUS_DOC: BranchStatusDocumentRecord = {
  branchId: 'paradise-hitech',
  tenantId: 'paradise',
  isOpen: true,
  isBusy: false,
  kitchenState: 'normal',
  updatedAt: 1_700_000_000_300,
};

const ROUTING_DOC: BranchRoutingDocumentRecord = {
  tenantId: 'paradise',
  scoringWeights: {
    distance: 0.35,
    eta: 0.25,
    deliveryFee: 0.1,
    capacityHeadroom: 0.15,
    inventoryAvailability: 0.1,
    openStatus: 0.05,
  },
  failoverPolicy: { enabled: true, maxAttempts: 2, preferSameZone: true },
  autoSelectEnabled: true,
  schemaVersion: 1,
};

const createMockPort = (
  overrides: Partial<BranchPersistencePort> = {}
): BranchPersistencePort => ({
  listBranchDocuments: async () => [ACTIVE_BRANCH, SUSPENDED_BRANCH],
  getBranchDocument: async (branchId) =>
    branchId === BRANCH_A ? ACTIVE_BRANCH : null,
  getBranchCapacityDocument: async (branchId) =>
    branchId === BRANCH_A ? CAPACITY_DOC : null,
  getBranchInventoryDocument: async (branchId) =>
    branchId === BRANCH_A ? INVENTORY_DOC : null,
  getBranchHoursDocument: async (branchId) =>
    branchId === BRANCH_A ? HOURS_DOC : null,
  getBranchStatusDocument: async (branchId) =>
    branchId === BRANCH_A ? STATUS_DOC : null,
  getBranchRoutingDocument: async (tenantId) =>
    tenantId === TENANT_ID ? ROUTING_DOC : null,
  ...overrides,
});

describe('BranchRepositoryMapper (M5 PR-3)', () => {
  it('maps branch document to summary and detail', () => {
    const summary = mapBranchDocumentToSummary(ACTIVE_BRANCH);
    assert.equal(String(summary.branchId), 'paradise-hitech');
    assert.equal(summary.name, 'Paradise — Hitech City');
    assert.equal(summary.isDefault, true);

    const detail = mapBranchDocumentToDetail(ACTIVE_BRANCH);
    assert.equal(detail.location.point.lat, 17.44);
    assert.equal(detail.deliveryConfigId, 'delivery-hitech');
  });

  it('classifies active branch documents', () => {
    assert.equal(isActiveBranchDocument(ACTIVE_BRANCH), true);
    assert.equal(isActiveBranchDocument(SUSPENDED_BRANCH), false);
  });

  it('filters branch documents with deterministic ordering', () => {
    const filtered = filterBranchDocuments([SUSPENDED_BRANCH, ACTIVE_BRANCH], {
      tenantId: TENANT_ID,
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.id, 'paradise-hitech');

    const all = filterBranchDocuments([SUSPENDED_BRANCH, ACTIVE_BRANCH], {
      tenantId: TENANT_ID,
      includeInactive: true,
    });
    assert.equal(all[0]?.id, 'paradise-banjara');
    assert.equal(all[1]?.id, 'paradise-hitech');
  });

  it('maps capacity, inventory, hours, status, and routing records', () => {
    const capacity = mapBranchCapacityDocument(CAPACITY_DOC);
    assert.equal(capacity.activeOrders, 3);
    assert.equal(capacity.congestionLevel, 'medium');

    const inventory = mapBranchInventoryDocument(INVENTORY_DOC);
    assert.deepEqual(inventory.unavailableItemIds, ['biryani-chicken']);

    const hours = mapBranchHoursDocument(HOURS_DOC);
    assert.equal(hours.timezone, 'Asia/Kolkata');
    assert.equal(hours.exceptions?.[0]?.label, 'Christmas');

    const status = mapBranchStatusDocument(STATUS_DOC);
    assert.equal(status.isOpen, true);

    const routing = mapBranchRoutingDocument(ROUTING_DOC);
    assert.equal(routing.scoringWeights.distance, 0.35);
    assert.equal(routing.failoverPolicy.maxAttempts, 2);
  });
});

describe('BranchRepositoryFactory (M5 PR-3)', () => {
  it('returns stub when repository flag is off', () => {
    const repository = createBranchRepository({
      persistencePort: createMockPort(),
      featureFlags: () => false,
    });
    assert.equal(repository.constructor.name, 'StubBranchRepository');
  });

  it('returns stub when flag is on but port is missing', () => {
    const repository = createBranchRepository({
      featureFlags: () => true,
    });
    assert.equal(repository.constructor.name, 'StubBranchRepository');
  });

  it('returns adapter when flag is on and port is provided', () => {
    const repository = createBranchRepository({
      persistencePort: createMockPort(),
      featureFlags: () => true,
    });
    assert.equal(repository.constructor.name, 'BranchRepositoryAdapter');
  });

  it('uses injected repository override', () => {
    const stub = createStubBranchRepository();
    const repository = createBranchRepository({
      repository: stub,
      persistencePort: createMockPort(),
      featureFlags: () => true,
    });
    assert.equal(repository, stub);
  });
});

describe('BranchRepositoryAdapter (M5 PR-3)', () => {
  it('lists active branches for tenant', async () => {
    const repository = createBranchRepositoryAdapter(createMockPort());
    const result = await repository.listBranches({ tenantId: TENANT_ID });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 1);
    assert.equal(String(result.value[0]?.branchId), 'paradise-hitech');
  });

  it('reads branch detail by id', async () => {
    const repository = createBranchRepositoryAdapter(createMockPort());
    const result = await repository.getBranchById(BRANCH_A);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.name, 'Paradise — Hitech City');
  });

  it('maps NOT_FOUND when branch document is missing', async () => {
    const repository = createBranchRepositoryAdapter(createMockPort());
    const result = await repository.getBranchById(BRANCH_B);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('reads capacity, inventory, hours, status, and routing', async () => {
    const repository = createBranchRepositoryAdapter(createMockPort());

    const capacity = await repository.getBranchCapacity(BRANCH_A);
    assert.equal(capacity.ok, true);

    const inventory = await repository.getBranchInventory(BRANCH_A);
    assert.equal(inventory.ok, true);
    if (inventory.ok) {
      assert.equal(inventory.value.items.length, 2);
    }

    const hours = await repository.getBranchHours(BRANCH_A);
    assert.equal(hours.ok, true);

    const status = await repository.getBranchStatus(BRANCH_A);
    assert.equal(status.ok, true);

    const routing = await repository.getRoutingPolicy(TENANT_ID);
    assert.equal(routing.ok, true);
  });

  it('maps persistence errors to UNAVAILABLE', async () => {
    const repository = createBranchRepositoryAdapter(
      createMockPort({
        getBranchDocument: async () => {
          throw new Error('port failure');
        },
      })
    );

    const result = await repository.getBranchById(BRANCH_A);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
    assert.equal(result.error.details?.branchCode, 'REPOSITORY_UNAVAILABLE');
  });
});

describe('StubBranchRepository (M5 PR-3)', () => {
  it('returns NOT_CONFIGURED for all read methods', async () => {
    const repository = createStubBranchRepository();

    const list = await repository.listBranches({ tenantId: TENANT_ID });
    assert.equal(list.ok, false);
    if (list.ok) return;
    assert.equal(list.error.details?.branchCode, 'NOT_CONFIGURED');

    const detail = await repository.getBranchById(BRANCH_A);
    assert.equal(detail.ok, false);
  });
});

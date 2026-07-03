import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TenantId } from '../core/types';
import type { BranchId } from '../branch/types/branded';
import type {
  BranchCapacityDocumentRecord,
  BranchHoursDocumentRecord,
  BranchInventoryDocumentRecord,
  BranchStatusDocumentRecord,
} from '../branch/repository/BranchPersistenceModels';
import {
  mapOperationalDocumentsToSnapshot,
  mapOperationalSnapshotDto,
  resolveOperationalCapturedAt,
} from '../branch/operations/BranchOperationsMapper';
import {
  createBranchOperationsPortFromBranchPort,
  type BranchOperationsPersistencePort,
} from '../branch/operations/BranchOperationsPersistencePort';
import {
  createBranchOperationsRepository,
  resolveBranchOperationsRepositoryEnabled,
} from '../branch/operations/BranchOperationsRepositoryFactory';
import { createBranchOperationsRepositoryAdapter } from '../branch/operations/BranchOperationsRepositoryAdapter';
import { createStubBranchOperationsRepository } from '../branch/operations/StubBranchOperationsRepository';

const TENANT_ID = 'paradise' as TenantId;
const BRANCH_A = 'paradise-hitech' as BranchId;
const BRANCH_B = 'paradise-banjara' as BranchId;

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
  rules: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '23:00', isClosed: false }],
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

const createMockPort = (
  overrides: Partial<BranchOperationsPersistencePort> = {}
): BranchOperationsPersistencePort => ({
  getBranchCapacityDocument: async (branchId) =>
    branchId === BRANCH_A ? CAPACITY_DOC : null,
  getBranchInventoryDocument: async (branchId) =>
    branchId === BRANCH_A ? INVENTORY_DOC : null,
  getBranchHoursDocument: async (branchId) => (branchId === BRANCH_A ? HOURS_DOC : null),
  getBranchStatusDocument: async (branchId) => (branchId === BRANCH_A ? STATUS_DOC : null),
  ...overrides,
});

describe('BranchOperationsMapper (M5 PR-11)', () => {
  it('maps operational documents to snapshot DTO deterministically', () => {
    const snapshot = mapOperationalDocumentsToSnapshot({
      branchId: BRANCH_A,
      status: STATUS_DOC,
      hours: HOURS_DOC,
      capacity: CAPACITY_DOC,
      inventory: INVENTORY_DOC,
    });

    assert.equal(String(snapshot.branchId), 'paradise-hitech');
    assert.equal(snapshot.status.isOpen, true);
    assert.equal(snapshot.hours.timezone, 'Asia/Kolkata');
    assert.equal(snapshot.capacity.activeOrders, 3);
    assert.deepEqual(snapshot.inventory.unavailableItemIds, ['biryani-chicken']);
    assert.equal(snapshot.capturedAt, 1_700_000_000_300);
  });

  it('resolves capturedAt from latest operational signal', () => {
    const capturedAt = resolveOperationalCapturedAt(
      {
        branchId: BRANCH_A,
        tenantId: 'paradise',
        isOpen: true,
        isBusy: false,
        kitchenState: 'normal',
        updatedAt: 100,
      },
      {
        branchId: BRANCH_A,
        tenantId: 'paradise',
        activeOrders: 1,
        maxConcurrentOrders: 10,
        prepQueueMins: 10,
        congestionLevel: 'low',
        acceptingOrders: true,
        capturedAt: 300,
      },
      {
        branchId: BRANCH_A,
        items: [],
        unavailableItemIds: [],
        capturedAt: 200,
      }
    );

    assert.equal(capturedAt, 300);
  });

  it('maps composed snapshot DTO with stable ordering', () => {
    const first = mapOperationalDocumentsToSnapshot({
      branchId: BRANCH_A,
      status: STATUS_DOC,
      hours: HOURS_DOC,
      capacity: CAPACITY_DOC,
      inventory: INVENTORY_DOC,
    });
    const second = mapOperationalDocumentsToSnapshot({
      branchId: BRANCH_A,
      status: STATUS_DOC,
      hours: HOURS_DOC,
      capacity: CAPACITY_DOC,
      inventory: INVENTORY_DOC,
    });

    assert.deepEqual(first, second);
  });
});

describe('BranchOperationsRepositoryFactory (M5 PR-11)', () => {
  it('resolveBranchOperationsRepositoryEnabled defaults to false', () => {
    assert.equal(resolveBranchOperationsRepositoryEnabled(), false);
  });

  it('returns stub when operations repository flag is off', () => {
    const repository = createBranchOperationsRepository({
      persistencePort: createMockPort(),
      featureFlags: () => false,
    });
    assert.equal(repository.constructor.name, 'StubBranchOperationsRepository');
  });

  it('returns stub when flag is on but port is missing', () => {
    const repository = createBranchOperationsRepository({
      featureFlags: () => true,
    });
    assert.equal(repository.constructor.name, 'StubBranchOperationsRepository');
  });

  it('returns adapter when flag is on and port is provided', () => {
    const repository = createBranchOperationsRepository({
      persistencePort: createMockPort(),
      featureFlags: () => true,
    });
    assert.equal(repository.constructor.name, 'BranchOperationsRepositoryAdapter');
  });

  it('uses injected repository override', () => {
    const stub = createStubBranchOperationsRepository();
    const repository = createBranchOperationsRepository({
      repository: stub,
      persistencePort: createMockPort(),
      featureFlags: () => true,
    });
    assert.equal(repository, stub);
  });

  it('creates operations port from branch persistence port subset', async () => {
    const branchPort = {
      getBranchCapacityDocument: async () => CAPACITY_DOC,
      getBranchInventoryDocument: async () => INVENTORY_DOC,
      getBranchHoursDocument: async () => HOURS_DOC,
      getBranchStatusDocument: async () => STATUS_DOC,
    };
    const port = createBranchOperationsPortFromBranchPort(branchPort);
    const capacity = await port.getBranchCapacityDocument(BRANCH_A);
    assert.equal(capacity?.activeOrders, 3);
  });
});

describe('BranchOperationsRepositoryAdapter (M5 PR-11)', () => {
  it('reads capacity, inventory, hours, and status', async () => {
    const repository = createBranchOperationsRepositoryAdapter(createMockPort());

    const capacity = await repository.getBranchCapacity(BRANCH_A);
    assert.equal(capacity.ok, true);
    if (capacity.ok) {
      assert.equal(capacity.value.congestionLevel, 'medium');
    }

    const inventory = await repository.getBranchInventory(BRANCH_A);
    assert.equal(inventory.ok, true);
    if (inventory.ok) {
      assert.equal(inventory.value.items.length, 2);
    }

    const hours = await repository.getBranchHours(BRANCH_A);
    assert.equal(hours.ok, true);
    if (hours.ok) {
      assert.equal(hours.value.exceptions?.[0]?.label, 'Christmas');
    }

    const status = await repository.getBranchStatus(BRANCH_A);
    assert.equal(status.ok, true);
    if (status.ok) {
      assert.equal(status.value.isOpen, true);
    }
  });

  it('reads aggregated operational snapshot', async () => {
    const repository = createBranchOperationsRepositoryAdapter(createMockPort());
    const result = await repository.getOperationalSnapshot(BRANCH_A);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(String(result.value.branchId), 'paradise-hitech');
    assert.equal(result.value.capacity.prepQueueMins, 15);
    assert.equal(result.value.inventory.unavailableItemIds.length, 1);
    assert.equal(result.value.capturedAt, 1_700_000_000_300);
  });

  it('maps NOT_FOUND when operational document is missing', async () => {
    const repository = createBranchOperationsRepositoryAdapter(createMockPort());
    const result = await repository.getBranchCapacity(BRANCH_B);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('maps persistence errors to UNAVAILABLE', async () => {
    const repository = createBranchOperationsRepositoryAdapter(
      createMockPort({
        getBranchStatusDocument: async () => {
          throw new Error('port failure');
        },
      })
    );

    const result = await repository.getBranchStatus(BRANCH_A);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
    assert.equal(result.error.details?.branchCode, 'REPOSITORY_UNAVAILABLE');
  });
});

describe('StubBranchOperationsRepository (M5 PR-11)', () => {
  it('returns NOT_CONFIGURED for all read methods', async () => {
    const repository = createStubBranchOperationsRepository();

    const status = await repository.getBranchStatus(BRANCH_A);
    assert.equal(status.ok, false);
    if (status.ok) return;
    assert.equal(status.error.details?.branchCode, 'NOT_CONFIGURED');

    const snapshot = await repository.getOperationalSnapshot(BRANCH_A);
    assert.equal(snapshot.ok, false);
  });
});

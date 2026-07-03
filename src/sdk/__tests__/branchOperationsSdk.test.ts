import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkFail, sdkOk } from '../core/resultHelpers';
import { sdkError } from '../core/resultHelpers';
import type { BranchId } from '../branch/types/branded';
import type { BranchOperationsRepository } from '../branch/operations/BranchOperationsRepository';
import type { BranchOperationsPersistencePort } from '../branch/operations/BranchOperationsPersistencePort';
import type {
  BranchCapacityDocumentRecord,
  BranchHoursDocumentRecord,
  BranchInventoryDocumentRecord,
  BranchStatusDocumentRecord,
} from '../branch/repository/BranchPersistenceModels';
import { mapOperationalDocumentsToSnapshot } from '../branch/operations/BranchOperationsMapper';
import {
  createBranchOperationsSdk,
  resolveBranchOperationsSdkEnabled,
} from '../branch/operations-sdk/createBranchOperationsSdk';
import { createStubBranchOperationsAdapter } from '../branch/operations-sdk/StubBranchOperationsAdapter';
import {
  mapAvailabilitySummaryToDto,
  mapHoursSnapshotToWeeklyHours,
  mapOperationalSnapshotDtoToDomainSnapshot,
} from '../branch/operations-sdk/BranchOperationsDomainMapper';
import type { BranchOperationsTelemetryEvent } from '../branch/operations-sdk/BranchOperationsTelemetry';
import { evaluateBranchOperations } from '../../domain/branch/operations/BranchOperationsEvaluator';

const BRANCH_ID = 'paradise-hitech' as BranchId;
const EVALUATED_AT = Date.UTC(2026, 5, 22, 10, 0, 0);

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
};

const STATUS_DOC: BranchStatusDocumentRecord = {
  branchId: 'paradise-hitech',
  tenantId: 'paradise',
  isOpen: true,
  isBusy: false,
  kitchenState: 'normal',
  updatedAt: 1_700_000_000_300,
};

const OPERATIONAL_SNAPSHOT = mapOperationalDocumentsToSnapshot({
  branchId: BRANCH_ID,
  status: STATUS_DOC,
  hours: HOURS_DOC,
  capacity: CAPACITY_DOC,
  inventory: INVENTORY_DOC,
});

const createMockPort = (
  overrides: Partial<BranchOperationsPersistencePort> = {}
): BranchOperationsPersistencePort => ({
  getBranchCapacityDocument: async (branchId) =>
    branchId === BRANCH_ID ? CAPACITY_DOC : null,
  getBranchInventoryDocument: async (branchId) =>
    branchId === BRANCH_ID ? INVENTORY_DOC : null,
  getBranchHoursDocument: async (branchId) => (branchId === BRANCH_ID ? HOURS_DOC : null),
  getBranchStatusDocument: async (branchId) => (branchId === BRANCH_ID ? STATUS_DOC : null),
  ...overrides,
});

const createMockRepository = (
  overrides: Partial<BranchOperationsRepository> = {}
): BranchOperationsRepository => ({
  getBranchStatus: async (branchId) => {
    const doc = branchId === BRANCH_ID ? STATUS_DOC : null;
    return doc
      ? sdkOk({
          branchId,
          tenantId: 'paradise',
          isOpen: doc.isOpen,
          isBusy: doc.isBusy,
          kitchenState: doc.kitchenState,
          updatedAt: doc.updatedAt,
        })
      : sdkFail(sdkError('NOT_FOUND', 'Branch status not found'));
  },
  getBranchHours: async (branchId) =>
    branchId === BRANCH_ID
      ? sdkOk({
          branchId,
          rules: HOURS_DOC.rules,
          timezone: HOURS_DOC.timezone,
        })
      : sdkFail(sdkError('NOT_FOUND', 'Branch hours not found')),
  getBranchCapacity: async (branchId) =>
    branchId === BRANCH_ID
      ? sdkOk({
          branchId,
          tenantId: 'paradise',
          activeOrders: 3,
          maxConcurrentOrders: 12,
          prepQueueMins: 15,
          congestionLevel: 'medium',
          acceptingOrders: true,
          capturedAt: 1_700_000_000_100,
        })
      : sdkFail(sdkError('NOT_FOUND', 'Branch capacity not found')),
  getBranchInventory: async (branchId) =>
    branchId === BRANCH_ID
      ? sdkOk({
          branchId,
          items: [
            { menuItemId: 'biryani-veg', available: true },
            { menuItemId: 'biryani-chicken', available: false },
          ],
          unavailableItemIds: ['biryani-chicken'],
          capturedAt: 1_700_000_000_200,
        })
      : sdkFail(sdkError('NOT_FOUND', 'Branch inventory not found')),
  getOperationalSnapshot: async (branchId) =>
    branchId === BRANCH_ID
      ? sdkOk(OPERATIONAL_SNAPSHOT)
      : sdkFail(
          sdkError('NOT_FOUND', 'Operational snapshot not found', { branchCode: 'NOT_FOUND' })
        ),
  ...overrides,
});

describe('Branch operations SDK (M5 PR-12)', () => {
  it('resolveBranchOperationsSdkEnabled defaults to false', () => {
    assert.equal(resolveBranchOperationsSdkEnabled(), false);
  });

  it('returns NOT_CONFIGURED when operations SDK flag is off', async () => {
    const sdk = createBranchOperationsSdk({
      persistencePort: createMockPort(),
      featureFlags: () => false,
    });

    const result = await sdk.getOperationalAvailability({ branchId: BRANCH_ID });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.details?.branchCode, 'NOT_CONFIGURED');
  });

  it('uses stub adapter when flag is off', () => {
    const sdk = createBranchOperationsSdk({ featureFlags: () => false });
    assert.equal(sdk.constructor.name, 'StubBranchOperationsAdapter');
    assert.equal(createStubBranchOperationsAdapter().constructor.name, 'StubBranchOperationsAdapter');
  });

  it('orchestrates repository read and domain evaluation when flag is on', async () => {
    let evaluatorCalled = false;

    const sdk = createBranchOperationsSdk({
      operationsRepository: createMockRepository(),
      featureFlags: (flag) => flag === 'FF_BRANCH_OPERATIONS_SDK_ENABLED',
      evaluateOperations: (snapshot, context) => {
        evaluatorCalled = true;
        assert.equal(snapshot.isOpen, true);
        assert.equal(context.operationsEnabled, true);
        return evaluateBranchOperations(snapshot, context);
      },
    });

    const result = await sdk.getOperationalAvailability({
      branchId: BRANCH_ID,
      branchName: 'Paradise — Hitech City',
      cartItemIds: ['biryani-veg'],
      evaluatedAt: EVALUATED_AT,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(evaluatorCalled, true);
    assert.equal(result.value.enabled, true);
    assert.equal(result.value.isOperationallyAvailable, true);
    assert.equal(result.value.capacity.activeOrders, 3);
    assert.equal(result.value.inventory.unavailableCount, 0);
    assert.equal(result.value.capturedAt, OPERATIONAL_SNAPSHOT.capturedAt);
  });

  it('reads operational snapshot through repository', async () => {
    const sdk = createBranchOperationsSdk({
      operationsRepository: createMockRepository(),
      featureFlags: (flag) => flag === 'FF_BRANCH_OPERATIONS_SDK_ENABLED',
    });

    const result = await sdk.getOperationalSnapshot(BRANCH_ID);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(String(result.value.branchId), 'paradise-hitech');
    assert.equal(result.value.capacity.prepQueueMins, 15);
  });

  it('maps NOT_FOUND from repository', async () => {
    const sdk = createBranchOperationsSdk({
      operationsRepository: createMockRepository(),
      featureFlags: (flag) => flag === 'FF_BRANCH_OPERATIONS_SDK_ENABLED',
    });

    const result = await sdk.getOperationalAvailability({
      branchId: 'missing-branch' as BranchId,
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('maps UNAVAILABLE when operations repository is disabled', async () => {
    const sdk = createBranchOperationsSdk({
      persistencePort: createMockPort(),
      featureFlags: (flag) => flag === 'FF_BRANCH_OPERATIONS_SDK_ENABLED',
    });

    const result = await sdk.getOperationalAvailability({ branchId: BRANCH_ID });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
    assert.equal(result.error.details?.branchCode, 'REPOSITORY_UNAVAILABLE');
  });

  it('validates branchId before repository read', async () => {
    const repository = createMockRepository({
      getOperationalSnapshot: async () => {
        throw new Error('should not be called');
      },
    });

    const sdk = createBranchOperationsSdk({
      operationsRepository: repository,
      featureFlags: (flag) => flag === 'FF_BRANCH_OPERATIONS_SDK_ENABLED',
    });

    const result = await sdk.getOperationalAvailability({ branchId: '' as BranchId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'VALIDATION');
  });

  it('maps domain snapshot and hours for evaluation', () => {
    const domainSnapshot = mapOperationalSnapshotDtoToDomainSnapshot(OPERATIONAL_SNAPSHOT, {
      branchId: BRANCH_ID,
      branchName: 'Paradise — Hitech City',
    });
    assert.equal(domainSnapshot.name, 'Paradise — Hitech City');
    assert.equal(domainSnapshot.acceptingOrders, true);
    assert.deepEqual(domainSnapshot.unavailableMenuItemIds, ['biryani-chicken']);

    const weeklyHours = mapHoursSnapshotToWeeklyHours(OPERATIONAL_SNAPSHOT.hours);
    assert.equal(weeklyHours[0]?.openMinute, 9 * 60);
    assert.equal(weeklyHours[0]?.closeMinute, 23 * 60);
  });

  it('maps domain availability summary to SDK DTO deterministically', () => {
    const domainSnapshot = mapOperationalSnapshotDtoToDomainSnapshot(OPERATIONAL_SNAPSHOT, {
      branchId: BRANCH_ID,
    });
    const evaluation = evaluateBranchOperations(domainSnapshot, {
      operationsEnabled: true,
      evaluatedAt: EVALUATED_AT,
      cartItemIds: ['biryani-veg'],
    });
    assert.equal(evaluation.enabled, true);
    if (!evaluation.enabled) return;

    const dto = mapAvailabilitySummaryToDto(evaluation.summary, OPERATIONAL_SNAPSHOT.capturedAt);
    const dtoAgain = mapAvailabilitySummaryToDto(evaluation.summary, OPERATIONAL_SNAPSHOT.capturedAt);
    assert.deepEqual(dto, dtoAgain);
    assert.equal(dto.isOperationallyAvailable, true);
  });

  it('emits operations telemetry events', async () => {
    const events: BranchOperationsTelemetryEvent[] = [];

    const sdk = createBranchOperationsSdk({
      operationsRepository: createMockRepository(),
      featureFlags: (flag) => flag === 'FF_BRANCH_OPERATIONS_SDK_ENABLED',
      onTelemetry: (event) => events.push(event),
    });

    await sdk.getOperationalAvailability({
      branchId: BRANCH_ID,
      cartItemIds: ['biryani-veg'],
      evaluatedAt: EVALUATED_AT,
    });

    assert.ok(events.some((event) => event.type === 'BRANCH_OPERATIONS_REQUEST'));
    assert.ok(events.some((event) => event.type === 'BRANCH_OPERATIONS_REPOSITORY_READ'));
    assert.ok(events.some((event) => event.type === 'BRANCH_OPERATIONS_DOMAIN_EVALUATION'));
    assert.ok(events.some((event) => event.type === 'BRANCH_OPERATIONS_SUCCESS'));
  });

  it('uses injected operations SDK override', () => {
    const stub = createStubBranchOperationsAdapter();
    const sdk = createBranchOperationsSdk({
      operationsSdk: stub,
      featureFlags: () => true,
    });
    assert.equal(sdk, stub);
  });
});

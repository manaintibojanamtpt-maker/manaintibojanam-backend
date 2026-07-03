import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../core/resultHelpers';
import type { TenantId } from '../core/types';
import type { BranchId } from '../branch/types/branded';
import { createBranchSDK, resolveBranchEnabled } from '../branch/createBranchSDK';
import { createDefaultBranchAdapter } from '../branch/adapters/DefaultBranchAdapter';
import { createStubBranchAdapter } from '../branch/adapters/StubBranchAdapter';
import { createStubBranchRepository } from '../branch/repository/StubBranchRepository';
import type { BranchRepository } from '../branch/repository/BranchRepository';
import type { BranchTelemetryEvent } from '../branch/adapters/BranchTelemetry';
import {
  buildBranchEtaEstimate,
  mapReadBundleToOperationalSnapshot,
  mapValidationToDto,
} from '../branch/adapters/BranchDomainMapper';
import { validateBranchForAssignment } from '../../domain/branch/validation/BranchValidation';
import type {
  BranchCapacityRecord,
  BranchDetail,
  BranchInventorySnapshot,
  BranchStatusSnapshot,
  BranchSummary,
} from '../branch/dto';

const TENANT_ID = 'paradise' as TenantId;
const BRANCH_ID = 'paradise-hitech' as BranchId;
const CUSTOMER_POINT = { lat: 17.44, lng: 78.38 };

const BRANCH_SUMMARY: BranchSummary = {
  branchId: BRANCH_ID,
  tenantId: TENANT_ID,
  name: 'Paradise — Hitech City',
  slug: 'hitech-city',
  status: 'active',
  isDefault: true,
};

const BRANCH_DETAIL: BranchDetail = {
  ...BRANCH_SUMMARY,
  location: {
    point: { lat: 17.441, lng: 78.381 },
    formattedAddress: 'Hitech City, Hyderabad',
  },
  deliveryConfigId: 'delivery-hitech',
};

const BRANCH_STATUS: BranchStatusSnapshot = {
  branchId: BRANCH_ID,
  tenantId: 'paradise',
  isOpen: true,
  isBusy: false,
  kitchenState: 'normal',
  updatedAt: 1_700_000_000_000,
};

const BRANCH_CAPACITY: BranchCapacityRecord = {
  branchId: BRANCH_ID,
  tenantId: 'paradise',
  activeOrders: 2,
  maxConcurrentOrders: 10,
  prepQueueMins: 12,
  congestionLevel: 'low',
  acceptingOrders: true,
  capturedAt: 1_700_000_000_100,
};

const BRANCH_INVENTORY: BranchInventorySnapshot = {
  branchId: BRANCH_ID,
  items: [{ menuItemId: 'biryani-veg', available: true }],
  unavailableItemIds: [],
  capturedAt: 1_700_000_000_200,
};

const flagsOn = () => true;
const flagsOff = () => false;
const branchOn = (flag: string) =>
  flag === 'FF_BRANCH_ENABLED' || flag === 'FF_BRANCH_REPOSITORY_ENABLED';

const createMockRepository = (
  overrides: Partial<BranchRepository> = {}
): BranchRepository => ({
  ...createStubBranchRepository(),
  listBranches: async () => sdkOk([BRANCH_SUMMARY]),
  getBranchById: async () => sdkOk(BRANCH_DETAIL),
  getBranchStatus: async () => sdkOk(BRANCH_STATUS),
  getBranchCapacity: async () => sdkOk(BRANCH_CAPACITY),
  getBranchInventory: async () => sdkOk(BRANCH_INVENTORY),
  getRoutingPolicy: async () =>
    sdkOk({
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
    }),
  ...overrides,
});

const createSyncResolver = () => {
  const bundle = {
    summary: BRANCH_SUMMARY,
    detail: BRANCH_DETAIL,
    status: BRANCH_STATUS,
    capacity: BRANCH_CAPACITY,
    inventory: BRANCH_INVENTORY,
  };

  return () => mapReadBundleToOperationalSnapshot(bundle, CUSTOMER_POINT);
};

describe('BranchSDK orchestration (M5 PR-4)', () => {
  it('resolveBranchEnabled returns false by default', () => {
    assert.equal(resolveBranchEnabled(), false);
    assert.equal(resolveBranchEnabled({ featureFlags: flagsOn }), true);
  });

  it('createBranchSDK returns stub adapter when FF_BRANCH_ENABLED is off', async () => {
    const sdk = createBranchSDK({ featureFlags: flagsOff });
    const result = await sdk.listBranches({ tenantId: TENANT_ID });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('createBranchSDK wires DefaultBranchAdapter when FF_BRANCH_ENABLED is on', async () => {
    const sdk = createBranchSDK({
      featureFlags: branchOn,
      branchRepository: createMockRepository(),
    });

    const result = await sdk.listBranches({ tenantId: TENANT_ID });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(String(result.value[0]?.branchId), 'paradise-hitech');
  });

  it('uses injected branchSdk override', async () => {
    const stub = createStubBranchAdapter();
    const sdk = createBranchSDK({
      branchSdk: stub,
      featureFlags: branchOn,
    });

    const result = await sdk.getBranch(BRANCH_ID);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('orchestrates getBranch through repository', async () => {
    const sdk = createDefaultBranchAdapter({
      repository: createMockRepository(),
      repositoryEnabled: true,
    });

    const result = await sdk.getBranch(BRANCH_ID);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.name, 'Paradise — Hitech City');
  });

  it('orchestrates findEligibleBranches with domain filtering', async () => {
    const sdk = createDefaultBranchAdapter({
      repository: createMockRepository(),
      repositoryEnabled: true,
    });

    const result = await sdk.findEligibleBranches({
      tenantId: TENANT_ID,
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 1);
    assert.equal(result.value[0]?.eligibility.isEligible, true);
    assert.equal(result.value[0]?.score, undefined);
  });

  it('orchestrates validateBranch with sync snapshot resolver', () => {
    const sdk = createDefaultBranchAdapter({
      repository: createMockRepository(),
      repositoryEnabled: true,
      syncSnapshotResolver: createSyncResolver(),
    });

    const result = sdk.validateBranch({
      tenantId: TENANT_ID,
      branchId: BRANCH_ID,
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.isValid, true);
  });

  it('orchestrates estimateETA from repository signals', async () => {
    const sdk = createDefaultBranchAdapter({
      repository: createMockRepository(),
      repositoryEnabled: true,
    });

    const result = await sdk.estimateETA({
      tenantId: TENANT_ID,
      branchId: BRANCH_ID,
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.prepTimeMins, 12);
    assert.ok(result.value.totalMins >= 12);
  });

  it('returns NOT_CONFIGURED for assignment methods', async () => {
    const sdk = createDefaultBranchAdapter({
      repository: createMockRepository(),
      repositoryEnabled: true,
    });

    const best = await sdk.findBestBranch({
      tenantId: TENANT_ID,
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    });
    assert.equal(best.ok, false);
    if (best.ok) return;
    assert.equal(best.error.code, 'NOT_CONFIGURED');

    const assign = await sdk.assignBranch({
      tenantId: TENANT_ID,
      branchId: BRANCH_ID,
      customerPoint: CUSTOMER_POINT,
      reason: 'nearest_serviceable',
    });
    assert.equal(assign.ok, false);
  });

  it('returns UNAVAILABLE when repository is disabled', async () => {
    const sdk = createDefaultBranchAdapter({
      repository: createMockRepository(),
      repositoryEnabled: false,
    });

    const result = await sdk.listBranches({ tenantId: TENANT_ID });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });

  it('maps repository NOT_FOUND errors', async () => {
    const sdk = createDefaultBranchAdapter({
      repository: createMockRepository({
        getBranchById: async () => ({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Branch not found',
            details: { branchCode: 'NOT_FOUND' },
          },
        }),
      }),
      repositoryEnabled: true,
    });

    const result = await sdk.getBranch(BRANCH_ID);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('emits telemetry events during orchestration', async () => {
    const events: BranchTelemetryEvent[] = [];
    const sdk = createDefaultBranchAdapter({
      repository: createMockRepository(),
      repositoryEnabled: true,
      onTelemetry: (event) => events.push(event),
    });

    await sdk.listBranches({ tenantId: TENANT_ID });

    assert.ok(events.some((event) => event.type === 'BRANCH_SDK_REQUEST'));
    assert.ok(events.some((event) => event.type === 'BRANCH_SDK_SUCCESS'));
  });

  it('maps domain validation results to SDK DTOs', () => {
    const snapshot = mapReadBundleToOperationalSnapshot(
      {
        summary: BRANCH_SUMMARY,
        detail: BRANCH_DETAIL,
        status: BRANCH_STATUS,
        capacity: BRANCH_CAPACITY,
        inventory: BRANCH_INVENTORY,
      },
      CUSTOMER_POINT
    );

    const domainResult = validateBranchForAssignment(snapshot, { orderType: 'delivery' });
    const dto = mapValidationToDto(domainResult);

    assert.equal(dto.isValid, true);
    assert.equal(dto.eligibility.status, 'serviceable');
  });

  it('builds ETA estimates without scoring', () => {
    const estimate = buildBranchEtaEstimate(BRANCH_ID, 12, 2.5, 'delivery');
    assert.equal(estimate.prepTimeMins, 12);
    assert.equal(estimate.deliveryTimeMins, 8);
    assert.equal(estimate.totalMins, 20);
  });
});

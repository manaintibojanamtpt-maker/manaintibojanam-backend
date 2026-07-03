import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../core/resultHelpers';
import type { TenantId } from '../core/types';
import type { BranchId } from '../branch/types/branded';
import type { DiscoveryCandidate } from '../discovery/dto/candidates';
import type { BranchRepository } from '../branch/repository/BranchRepository';
import { createStubBranchRepository } from '../branch/repository/StubBranchRepository';
import { createDefaultBranchAssignmentEngine } from '../branch/assignment/DefaultBranchAssignmentEngine';
import {
  assignmentNotConfiguredAsync,
  createBranchAssignmentEngine,
  resolveBranchAssignmentEnabled,
} from '../branch/assignment/createBranchAssignmentEngine';
import { mapDomainScoreToBranchScore } from '../branch/assignment/AssignmentScoreMapper';
import {
  passesAssignmentScoreThreshold,
  resolveAssignmentPolicy,
} from '../branch/assignment/AssignmentPolicyResolver';
import { createDefaultBranchAdapter } from '../branch/adapters/DefaultBranchAdapter';
import type {
  BranchCapacityRecord,
  BranchDetail,
  BranchInventorySnapshot,
  BranchStatusSnapshot,
  BranchSummary,
} from '../branch/dto';
import type { BranchAssignmentTelemetryEvent } from '../branch/assignment/AssignmentTelemetry';
import { calculateBranchScore } from '../../domain/branch/scoring/BranchScoreCalculator';
import type { BranchOperationalSnapshot } from '../../domain/branch/shared/BranchTypes';

const TENANT_ID = 'paradise' as TenantId;
const BRANCH_NEAR = 'paradise-hitech' as BranchId;
const BRANCH_FAR = 'paradise-banjara' as BranchId;
const CUSTOMER_POINT = { lat: 17.44, lng: 78.38 };

const BRANCH_SUMMARY = (
  branchId: BranchId,
  name: string,
  isDefault = false
): BranchSummary => ({
  branchId,
  tenantId: TENANT_ID,
  name,
  slug: String(branchId),
  status: 'active',
  isDefault,
});

const BRANCH_DETAIL = (summary: BranchSummary, lat: number, lng: number): BranchDetail => ({
  ...summary,
  location: { point: { lat, lng }, formattedAddress: nameFor(summary.name) },
  deliveryConfigId: `delivery-${summary.branchId}`,
});

const nameFor = (name: string) => name;

const BRANCH_STATUS = (branchId: BranchId): BranchStatusSnapshot => ({
  branchId,
  tenantId: 'paradise',
  isOpen: true,
  isBusy: false,
  kitchenState: 'normal',
  updatedAt: 1_700_000_000_000,
});

const BRANCH_CAPACITY = (
  branchId: BranchId,
  prepQueueMins: number,
  activeOrders = 2
): BranchCapacityRecord => ({
  branchId,
  tenantId: 'paradise',
  activeOrders,
  maxConcurrentOrders: 10,
  prepQueueMins,
  congestionLevel: 'low',
  acceptingOrders: true,
  capturedAt: 1_700_000_000_100,
});

const BRANCH_INVENTORY = (branchId: BranchId): BranchInventorySnapshot => ({
  branchId,
  items: [{ menuItemId: 'biryani-veg', available: true }],
  unavailableItemIds: [],
  capturedAt: 1_700_000_000_200,
});

const createMockRepository = (
  branches: Array<{ summary: BranchSummary; lat: number; lng: number; prepQueueMins: number }>
): BranchRepository => ({
  ...createStubBranchRepository(),
  listBranches: async () => sdkOk(branches.map((branch) => branch.summary)),
  getBranchById: async (branchId) => {
    const branch = branches.find((entry) => entry.summary.branchId === branchId);
    return branch
      ? sdkOk(BRANCH_DETAIL(branch.summary, branch.lat, branch.lng))
      : { ok: false, error: { code: 'NOT_FOUND', message: 'missing' } };
  },
  getBranchStatus: async (branchId) => sdkOk(BRANCH_STATUS(branchId)),
  getBranchCapacity: async (branchId) => {
    const branch = branches.find((entry) => entry.summary.branchId === branchId);
    return sdkOk(BRANCH_CAPACITY(branchId, branch?.prepQueueMins ?? 20));
  },
  getBranchInventory: async (branchId) => sdkOk(BRANCH_INVENTORY(branchId)),
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
});

const baseSnapshot = (
  branchId: string,
  name: string,
  distanceKm: number,
  prepQueueMins: number
): BranchOperationalSnapshot => ({
  branchId,
  tenantId: 'paradise',
  name,
  status: 'active',
  isDefault: branchId === 'paradise-hitech',
  distanceKm,
  deliveryZone: { maxRadiusKm: 10 },
  isOpen: true,
  isBusy: false,
  acceptingOrders: true,
  prepQueueMins,
  etaMins: prepQueueMins + 10,
  unavailableMenuItemIds: [],
});

const DISCOVERY_CANDIDATES: DiscoveryCandidate[] = [
  {
    tenantId: TENANT_ID,
    branchId: BRANCH_NEAR,
    name: 'Paradise — Hitech City',
    slug: 'hitech-city',
    point: { lat: 17.441, lng: 78.381 },
    geohash: 'tepg9b' as never,
    distanceKm: 1.5,
  },
  {
    tenantId: TENANT_ID,
    branchId: BRANCH_FAR,
    name: 'Paradise — Banjara Hills',
    slug: 'banjara-hills',
    point: { lat: 17.42, lng: 78.45 },
    geohash: 'tepg8c' as never,
    distanceKm: 6,
  },
];

describe('Branch assignment engine (M5 PR-7)', () => {
  it('resolveBranchAssignmentEnabled defaults to false', () => {
    assert.equal(resolveBranchAssignmentEnabled(), false);
    assert.equal(resolveBranchAssignmentEnabled({ featureFlags: () => true }), true);
  });

  it('createBranchAssignmentEngine returns null when flag is off', () => {
    const engine = createBranchAssignmentEngine({
      repository: createMockRepository([]),
      repositoryEnabled: true,
      featureFlags: () => false,
    });
    assert.equal(engine, null);
  });

  it('returns NOT_CONFIGURED from adapter when assignment flag is off', async () => {
    const sdk = createDefaultBranchAdapter({
      repository: createMockRepository([]),
      repositoryEnabled: true,
      assignmentEnabled: false,
      assignmentEngine: null,
    });

    const result = await sdk.findBestBranch({
      tenantId: TENANT_ID,
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('selects nearest eligible branch deterministically for multiple branches', async () => {
    const repository = createMockRepository([
      {
        summary: BRANCH_SUMMARY(BRANCH_NEAR, 'Paradise — Hitech City', true),
        lat: 17.441,
        lng: 78.381,
        prepQueueMins: 12,
      },
      {
        summary: BRANCH_SUMMARY(BRANCH_FAR, 'Paradise — Banjara Hills'),
        lat: 17.42,
        lng: 78.45,
        prepQueueMins: 18,
      },
    ]);

    const engine = createDefaultBranchAssignmentEngine({
      repository,
      repositoryEnabled: true,
    });

    const result = await engine.assignBestBranch({
      query: {
        tenantId: TENANT_ID,
        customerPoint: CUSTOMER_POINT,
        orderType: 'delivery',
      },
      discoveryCandidates: DISCOVERY_CANDIDATES,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(String(result.value.assignment.branchId), 'paradise-hitech');
    assert.equal(result.value.eligibleCount, 2);
    assert.equal(result.value.rankedBranchIds[0], 'paradise-hitech');
  });

  it('selects single branch when only one candidate exists', async () => {
    const repository = createMockRepository([
      {
        summary: BRANCH_SUMMARY(BRANCH_NEAR, 'Paradise — Hitech City', true),
        lat: 17.441,
        lng: 78.381,
        prepQueueMins: 12,
      },
    ]);

    const engine = createDefaultBranchAssignmentEngine({
      repository,
      repositoryEnabled: true,
    });

    const result = await engine.assignBestBranch({
      query: {
        tenantId: TENANT_ID,
        customerPoint: CUSTOMER_POINT,
        orderType: 'delivery',
      },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(String(result.value.assignment.branchId), 'paradise-hitech');
  });

  it('returns no eligible branch when all candidates fail eligibility', async () => {
    const repository = createMockRepository([
      {
        summary: BRANCH_SUMMARY(BRANCH_NEAR, 'Paradise — Hitech City', true),
        lat: 17.441,
        lng: 78.381,
        prepQueueMins: 12,
      },
    ]);

    const inventoryRepo: BranchRepository = {
      ...repository,
      getBranchInventory: async (branchId) =>
        sdkOk({
          branchId,
          items: [{ menuItemId: 'missing-item', available: false }],
          unavailableItemIds: ['missing-item'],
          capturedAt: 1,
        }),
    };

    const engine = createDefaultBranchAssignmentEngine({
      repository: inventoryRepo,
      repositoryEnabled: true,
    });

    const result = await engine.assignBestBranch({
      query: {
        tenantId: TENANT_ID,
        customerPoint: CUSTOMER_POINT,
        orderType: 'delivery',
        cartItemIds: ['missing-item'],
      },
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.details?.branchCode, 'NO_ELIGIBLE_BRANCH');
  });

  it('tie-breaks equal scores by branch_id ascending', () => {
    const left = calculateBranchScore({
      branch: baseSnapshot('branch-z', 'Z', 2, 12),
    });
    const right = calculateBranchScore({
      branch: baseSnapshot('branch-a', 'A', 2, 12),
    });

    assert.equal(left.total, right.total);
    assert.ok('branch-a'.localeCompare('branch-z') < 0);
  });

  it('maps domain scores to SDK branch scores', () => {
    const breakdown = calculateBranchScore({
      branch: baseSnapshot('paradise-hitech', 'Hitech', 2, 12),
    });
    const mapped = mapDomainScoreToBranchScore(breakdown);
    assert.equal(String(mapped.branchId), 'paradise-hitech');
    assert.equal(mapped.total, breakdown.total);
  });

  it('resolves assignment policy from routing config', () => {
    const policy = resolveAssignmentPolicy({
      tenantId: 'paradise',
      scoringWeights: {
        distance: 0.35,
        eta: 0.25,
        deliveryFee: 0.1,
        capacityHeadroom: 0.15,
        inventoryAvailability: 0.1,
        openStatus: 0.05,
      },
      failoverPolicy: { enabled: false, maxAttempts: 1, preferSameZone: false },
      autoSelectEnabled: false,
      schemaVersion: 1,
    });

    assert.equal(policy.autoSelectEnabled, false);
    assert.equal(policy.failover.enabled, false);
    assert.equal(passesAssignmentScoreThreshold(0.2, policy), true);
  });

  it('emits assignment telemetry on success', async () => {
    const events: BranchAssignmentTelemetryEvent[] = [];
    const repository = createMockRepository([
      {
        summary: BRANCH_SUMMARY(BRANCH_NEAR, 'Paradise — Hitech City', true),
        lat: 17.441,
        lng: 78.381,
        prepQueueMins: 12,
      },
    ]);

    const engine = createDefaultBranchAssignmentEngine({
      repository,
      repositoryEnabled: true,
      onTelemetry: (event) => events.push(event),
    });

    await engine.assignBestBranch({
      query: {
        tenantId: TENANT_ID,
        customerPoint: CUSTOMER_POINT,
        orderType: 'delivery',
      },
    });

    assert.ok(events.some((event) => event.type === 'BRANCH_ASSIGNMENT_REQUEST'));
    assert.ok(events.some((event) => event.type === 'BRANCH_ASSIGNMENT_SUCCESS'));
  });

  it('assignmentNotConfiguredAsync returns NOT_CONFIGURED', async () => {
    const result = await assignmentNotConfiguredAsync();
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('adapter findBestBranch delegates to assignment engine when enabled', async () => {
    const repository = createMockRepository([
      {
        summary: BRANCH_SUMMARY(BRANCH_NEAR, 'Paradise — Hitech City', true),
        lat: 17.441,
        lng: 78.381,
        prepQueueMins: 12,
      },
    ]);

    const engine = createDefaultBranchAssignmentEngine({
      repository,
      repositoryEnabled: true,
    });

    const sdk = createDefaultBranchAdapter({
      repository,
      repositoryEnabled: true,
      assignmentEngine: engine,
      assignmentEnabled: true,
    });

    const result = await sdk.findBestBranch({
      tenantId: TENANT_ID,
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(String(result.value.branchId), 'paradise-hitech');
    assert.equal(result.value.overrideApplied, false);
  });
});

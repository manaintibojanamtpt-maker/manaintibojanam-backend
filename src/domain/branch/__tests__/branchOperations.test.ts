import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BranchOperationalSnapshot } from '../shared/BranchTypes';
import {
  evaluateBranchOperations,
  evaluateBranchOperationsMetadata,
  isBranchOperationsEnabled,
} from '../operations/BranchOperationsEvaluator';
import { evaluateBranchHours, isWithinWeeklyHours } from '../operations/BranchHoursEvaluator';
import {
  computeCapacityUtilization,
  evaluateBranchCapacity,
} from '../operations/BranchCapacityEvaluator';
import {
  evaluateBranchInventory,
  resolveMissingInventoryItemIds,
} from '../operations/BranchInventoryEvaluator';
import {
  BRANCH_OPERATIONS_ALGORITHM_VERSION,
  BRANCH_OPERATIONS_FLAG,
  BRANCH_OPERATIONS_VERSION,
  createBranchOperationsMetadata,
} from '../operations/BranchOperationsMetadata';

const MONDAY_10AM_UTC = Date.UTC(2026, 5, 23, 10, 0, 0);

const WEEKDAY_HOURS = [
  { dayOfWeek: 1 as const, openMinute: 9 * 60, closeMinute: 22 * 60 },
  { dayOfWeek: 2 as const, openMinute: 9 * 60, closeMinute: 22 * 60 },
  { dayOfWeek: 3 as const, openMinute: 9 * 60, closeMinute: 22 * 60 },
  { dayOfWeek: 4 as const, openMinute: 9 * 60, closeMinute: 22 * 60 },
  { dayOfWeek: 5 as const, openMinute: 9 * 60, closeMinute: 22 * 60 },
  { dayOfWeek: 6 as const, openMinute: 9 * 60, closeMinute: 22 * 60 },
  { dayOfWeek: 0 as const, openMinute: 10 * 60, closeMinute: 21 * 60 },
];

const baseBranch = (
  overrides: Partial<BranchOperationalSnapshot> = {}
): BranchOperationalSnapshot => ({
  branchId: 'branch-a',
  tenantId: 'paradise',
  name: 'Paradise Hitech City',
  status: 'active',
  isDefault: false,
  distanceKm: 2.5,
  deliveryZone: { maxRadiusKm: 8, freeRadiusKm: 3, paidRadiusKm: 6 },
  isOpen: true,
  isBusy: false,
  acceptingOrders: true,
  congestionLevel: 'low',
  activeOrders: 2,
  maxConcurrentOrders: 10,
  prepQueueMins: 10,
  etaMins: 35,
  deliveryFee: 40,
  rating: 4.5,
  unavailableMenuItemIds: [],
  ...overrides,
});

describe('Branch operations intelligence (M5 PR-10)', () => {
  it('isBranchOperationsEnabled defaults to false', () => {
    assert.equal(isBranchOperationsEnabled(), false);
    assert.equal(BRANCH_OPERATIONS_FLAG, 'FF_BRANCH_OPERATIONS_ENABLED');
  });

  it('returns disabled summary when operations flag is off', () => {
    const result = evaluateBranchOperations(baseBranch(), {
      operationsEnabled: false,
      evaluatedAt: MONDAY_10AM_UTC,
    });

    assert.equal(result.enabled, false);
    if (result.enabled) return;
    assert.equal(result.summary.enabled, false);
    assert.equal(result.summary.branchId, 'branch-a');
  });

  it('evaluates open hours from snapshot', () => {
    const open = evaluateBranchHours(baseBranch(), { evaluatedAt: MONDAY_10AM_UTC });
    assert.equal(open.status, 'open');
    assert.equal(open.isOpen, true);

    const closed = evaluateBranchHours(baseBranch({ isOpen: false }), {
      evaluatedAt: MONDAY_10AM_UTC,
    });
    assert.equal(closed.status, 'closed');
    assert.equal(closed.isOpen, false);
  });

  it('evaluates weekly schedule for open and closed hours', () => {
    assert.equal(isWithinWeeklyHours(MONDAY_10AM_UTC, WEEKDAY_HOURS), true);

    const lateNight = Date.UTC(2026, 5, 23, 23, 30, 0);
    assert.equal(isWithinWeeklyHours(lateNight, WEEKDAY_HOURS), false);

    const hours = evaluateBranchHours(baseBranch(), {
      evaluatedAt: lateNight,
      weeklyHours: WEEKDAY_HOURS,
    });
    assert.equal(hours.status, 'closed');
  });

  it('evaluates capacity available', () => {
    const capacity = evaluateBranchCapacity(baseBranch());
    assert.equal(capacity.status, 'available');
    assert.equal(capacity.isAvailable, true);
    assert.equal(computeCapacityUtilization(2, 10), 0.2);
  });

  it('evaluates capacity limited when busy', () => {
    const capacity = evaluateBranchCapacity(
      baseBranch({ isBusy: true, congestionLevel: 'medium' })
    );
    assert.equal(capacity.status, 'limited');
    assert.equal(capacity.isAvailable, true);
  });

  it('evaluates capacity full when queue is saturated', () => {
    const capacity = evaluateBranchCapacity(
      baseBranch({
        activeOrders: 10,
        maxConcurrentOrders: 10,
        acceptingOrders: false,
      })
    );
    assert.equal(capacity.status, 'full');
    assert.equal(capacity.isAvailable, false);
  });

  it('evaluates inventory complete', () => {
    const inventory = evaluateBranchInventory(baseBranch(), {
      cartItemIds: ['biryani-veg', 'raita'],
    });
    assert.equal(inventory.status, 'complete');
    assert.equal(inventory.isSufficient, true);
    assert.equal(inventory.unavailableCount, 0);
  });

  it('evaluates inventory partial when partial coverage allowed', () => {
    const inventory = evaluateBranchInventory(
      baseBranch({ unavailableMenuItemIds: ['biryani-veg'] }),
      {
        cartItemIds: ['biryani-veg', 'raita'],
        requireFullInventoryCoverage: false,
      }
    );
    assert.equal(inventory.status, 'partial');
    assert.equal(inventory.isSufficient, true);
    assert.equal(inventory.missingItemIds.length, 1);
  });

  it('evaluates inventory unavailable when full coverage required', () => {
    const inventory = evaluateBranchInventory(
      baseBranch({ unavailableMenuItemIds: ['biryani-veg'] }),
      {
        cartItemIds: ['biryani-veg', 'raita'],
        requireFullInventoryCoverage: true,
      }
    );
    assert.equal(inventory.status, 'unavailable');
    assert.equal(inventory.isSufficient, false);
  });

  it('evaluates inventory unavailable when all items missing', () => {
    const inventory = evaluateBranchInventory(
      baseBranch({ unavailableMenuItemIds: ['biryani-veg', 'raita'] }),
      { cartItemIds: ['biryani-veg', 'raita'] }
    );
    assert.equal(inventory.status, 'unavailable');
    assert.equal(inventory.isSufficient, false);
  });

  it('builds availability summary for operationally available branch', () => {
    const result = evaluateBranchOperations(baseBranch(), {
      operationsEnabled: true,
      evaluatedAt: MONDAY_10AM_UTC,
      cartItemIds: ['biryani-veg'],
    });

    assert.equal(result.enabled, true);
    if (!result.enabled) return;
    assert.equal(result.summary.isOperationallyAvailable, true);
    assert.equal(result.summary.blockers.length, 0);
  });

  it('builds availability summary with blockers when branch is closed', () => {
    const result = evaluateBranchOperations(baseBranch({ isOpen: false }), {
      operationsEnabled: true,
      evaluatedAt: MONDAY_10AM_UTC,
    });

    assert.equal(result.enabled, true);
    if (!result.enabled) return;
    assert.equal(result.summary.isOperationallyAvailable, false);
    assert.ok(result.summary.blockers.length > 0);
    assert.equal(result.summary.hours.status, 'closed');
  });

  it('builds availability summary when branch is suspended', () => {
    const result = evaluateBranchOperations(baseBranch({ status: 'suspended' }), {
      operationsEnabled: true,
      evaluatedAt: MONDAY_10AM_UTC,
    });

    assert.equal(result.enabled, true);
    if (!result.enabled) return;
    assert.equal(result.summary.operationalStatus.isActive, false);
    assert.equal(result.summary.isOperationallyAvailable, false);
  });

  it('creates operations metadata from availability summary', () => {
    const result = evaluateBranchOperations(baseBranch(), {
      operationsEnabled: true,
      evaluatedAt: MONDAY_10AM_UTC,
    });
    assert.equal(result.enabled, true);
    if (!result.enabled) return;

    const metadata = createBranchOperationsMetadata(result.summary);
    assert.equal(metadata.algorithmVersion, BRANCH_OPERATIONS_ALGORITHM_VERSION);
    assert.equal(metadata.operationsVersion, BRANCH_OPERATIONS_VERSION);
    assert.equal(metadata.isOperationallyAvailable, true);
    assert.equal(metadata.blockerCount, 0);
  });

  it('returns null metadata when operations flag is off', () => {
    const metadata = evaluateBranchOperationsMetadata(baseBranch(), {
      operationsEnabled: false,
    });
    assert.equal(metadata, null);
  });

  it('resolveMissingInventoryItemIds is deterministic', () => {
    const missing = resolveMissingInventoryItemIds(
      ['a', 'b', 'c'],
      ['b', 'd']
    );
    assert.deepEqual(missing, ['b']);
  });

  it('produces deterministic outputs for identical inputs', () => {
    const branch = baseBranch();
    const context = {
      operationsEnabled: true,
      evaluatedAt: MONDAY_10AM_UTC,
      cartItemIds: ['biryani-veg'],
      weeklyHours: WEEKDAY_HOURS,
    };

    const first = evaluateBranchOperations(branch, context);
    const second = evaluateBranchOperations(branch, context);

    assert.deepEqual(first, second);
  });
});

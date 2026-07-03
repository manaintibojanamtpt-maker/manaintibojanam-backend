import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_BRANCH_ASSIGNMENT_POLICY,
  meetsMinimumScoreThreshold,
  resolvePreferredAssignmentReason,
  shouldAttemptFailover,
} from '../assignment/BranchAssignmentPolicy';
import {
  BRANCH_ASSIGNMENT_METADATA_VERSION,
  createBranchAssignmentMetadata,
  withAssignmentTimestamp,
} from '../assignment/BranchAssignmentMetadata';
import {
  BRANCH_ASSIGNMENT_REASONS,
  isAutomaticAssignmentReason,
  isOverrideAssignmentReason,
} from '../assignment/BranchAssignmentReason';
import {
  evaluateBranchEligibility,
  filterEligibleBranches,
} from '../eligibility/BranchEligibilityValidator';
import {
  hasInventoryCoverage,
  isWithinRadius,
} from '../eligibility/BranchEligibilityRules';
import {
  calculateBranchScore,
  computeInventoryCoverage,
  normalizeDistanceSignal,
  normalizeEtaSignal,
  rankScoredBranches,
} from '../scoring/BranchScoreCalculator';
import { compareBranchScoreBreakdowns } from '../scoring/BranchScoreBreakdown';
import {
  BRANCH_DOMAIN_SCORE_WEIGHTS,
  sumBranchScoreWeights,
  validateBranchScoreWeights,
} from '../scoring/BranchScoreWeights';
import { BRANCH_DOMAIN_VERSION } from '../shared/BranchConstants';
import {
  selectBestEligibleBranch,
  validateBranchDomainWeights,
  validateBranchForAssignment,
  validateBranchSelectionQuery,
} from '../validation/BranchValidation';
import type { BranchOperationalSnapshot, BranchSelectionQuery } from '../shared/BranchTypes';

const CUSTOMER_POINT = { lat: 17.44, lng: 78.38 };

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

describe('Branch domain foundation (M5 PR-2)', () => {
  it('exports BRANCH_DOMAIN_VERSION', () => {
    assert.equal(BRANCH_DOMAIN_VERSION, '0.1.0-foundation');
  });

  it('validates branch score weights sum to 1.0', () => {
    assert.equal(validateBranchScoreWeights(), true);
    assert.equal(sumBranchScoreWeights(BRANCH_DOMAIN_SCORE_WEIGHTS), 1);
    assert.equal(validateBranchDomainWeights().ok, true);
  });

  it('validates branch selection query', () => {
    const valid: BranchSelectionQuery = {
      tenantId: 'paradise',
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    };
    assert.equal(validateBranchSelectionQuery(valid).ok, true);

    const invalid = validateBranchSelectionQuery({
      tenantId: '',
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    });
    assert.equal(invalid.ok, false);
  });

  it('classifies assignment reasons', () => {
    assert.equal(isOverrideAssignmentReason('customer_override'), true);
    assert.equal(isAutomaticAssignmentReason('nearest_serviceable'), true);
    assert.equal(BRANCH_ASSIGNMENT_REASONS.length, 8);
  });

  it('resolves assignment policy helpers', () => {
    assert.equal(resolvePreferredAssignmentReason('delivery'), 'nearest_serviceable');
    assert.equal(resolvePreferredAssignmentReason('pickup'), 'pickup_selected');
    assert.equal(meetsMinimumScoreThreshold(0.5), true);
    assert.equal(shouldAttemptFailover(0), true);
    assert.equal(shouldAttemptFailover(3), false);
    assert.equal(DEFAULT_BRANCH_ASSIGNMENT_POLICY.tieBreakStrategy, 'branch_id_asc');
  });

  it('creates assignment metadata deterministically', () => {
    const branch = baseBranch();
    const eligibility = evaluateBranchEligibility(branch, { orderType: 'delivery' });
    const score = calculateBranchScore({ branch });

    const metadata = createBranchAssignmentMetadata({
      tenantId: 'paradise',
      branchId: branch.branchId,
      branchName: branch.name,
      reason: 'nearest_serviceable',
      score,
      eligibility,
      assignedAt: 1_700_000_000_000,
      correlationId: 'corr-1',
    });

    assert.equal(metadata.policyVersion, BRANCH_ASSIGNMENT_METADATA_VERSION);
    assert.equal(metadata.overrideApplied, false);
    assert.equal(
      withAssignmentTimestamp(metadata, 2_000).assignedAt,
      2_000
    );
  });

  it('normalizes distance and eta signals', () => {
    assert.equal(normalizeDistanceSignal(0, 10), 1);
    assert.equal(normalizeDistanceSignal(10, 10), 0);
    assert.equal(normalizeEtaSignal(45, 90), 0.5);
    assert.equal(computeInventoryCoverage(['a', 'b'], ['b']), 0.5);
  });

  it('calculates branch score deterministically', () => {
    const branch = baseBranch();
    const first = calculateBranchScore({ branch, cartItemIds: ['item-1'] });
    const second = calculateBranchScore({ branch, cartItemIds: ['item-1'] });

    assert.deepEqual(first, second);
    assert.ok(first.total > 0);
    assert.equal(first.factors.length, 7);
  });

  it('ranks branches by score with branch_id tie-break', () => {
    const high = calculateBranchScore({ branch: baseBranch({ branchId: 'branch-b', distanceKm: 1 }) });
    const low = calculateBranchScore({ branch: baseBranch({ branchId: 'branch-a', distanceKm: 6 }) });

    const ranked = rankScoredBranches([low, high]);
    assert.equal(ranked[0]?.branchId, 'branch-b');
    assert.ok(compareBranchScoreBreakdowns(high, low) < 0);
  });

  it('evaluates eligibility for serviceable branch', () => {
    const result = evaluateBranchEligibility(baseBranch(), { orderType: 'delivery' });
    assert.equal(result.isEligible, true);
    assert.equal(result.status, 'serviceable');
  });

  it('fails eligibility when out of radius', () => {
    const result = evaluateBranchEligibility(
      baseBranch({ distanceKm: 12 }),
      { orderType: 'delivery' }
    );
    assert.equal(result.isEligible, false);
    assert.equal(result.status, 'out_of_radius');
  });

  it('fails eligibility when inventory is short', () => {
    const result = evaluateBranchEligibility(
      baseBranch({ unavailableMenuItemIds: ['item-1'] }),
      { orderType: 'delivery', cartItemIds: ['item-1', 'item-2'] }
    );
    assert.equal(result.isEligible, false);
    assert.equal(result.status, 'inventory_short');
    assert.equal(hasInventoryCoverage(['item-1'], ['item-1'], true), false);
  });

  it('allows pickup when out of delivery radius', () => {
    const result = evaluateBranchEligibility(
      baseBranch({ distanceKm: 20 }),
      { orderType: 'pickup' }
    );
    assert.equal(result.isEligible, true);
    assert.equal(isWithinRadius(20, 8), false);
  });

  it('filters eligible branches', () => {
    const branches = [
      baseBranch({ branchId: 'near', distanceKm: 2 }),
      baseBranch({ branchId: 'far', distanceKm: 15 }),
    ];

    const eligible = filterEligibleBranches(branches, { orderType: 'delivery' });
    assert.equal(eligible.length, 1);
    assert.equal(eligible[0]?.branchId, 'near');
  });

  it('validates branch for assignment', () => {
    const validation = validateBranchForAssignment(baseBranch(), { orderType: 'delivery' });
    assert.equal(validation.isValid, true);
    assert.equal(validation.issues.length, 0);
  });

  it('selects best eligible branch deterministically', () => {
    const branches = [
      baseBranch({ branchId: 'branch-z', distanceKm: 4 }),
      baseBranch({ branchId: 'branch-a', distanceKm: 2 }),
      baseBranch({ branchId: 'branch-m', distanceKm: 15 }),
    ];

    const outcome = selectBestEligibleBranch(branches, { orderType: 'delivery' });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.value.branchId, 'branch-a');
  });

  it('returns no eligible branch when all fail eligibility', () => {
    const outcome = selectBestEligibleBranch(
      [baseBranch({ isOpen: false })],
      { orderType: 'delivery' }
    );
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'NO_ELIGIBLE_BRANCH');
  });

  it('tie-breaks equal scores by branch_id ascending', () => {
    const branches = [
      baseBranch({ branchId: 'branch-z', distanceKm: 2, etaMins: 30 }),
      baseBranch({ branchId: 'branch-a', distanceKm: 2, etaMins: 30 }),
    ];

    const outcome = selectBestEligibleBranch(branches, { orderType: 'delivery' });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.value.branchId, 'branch-a');
  });
});

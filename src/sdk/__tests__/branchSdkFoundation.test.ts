import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BRANCH_SDK_FEATURE_FLAG_DEFAULTS,
  BRANCH_SDK_FEATURE_FLAG_ENV_KEYS,
} from '../branch/core/featureFlags';
import {
  BRANCH_PLATFORM_LAW,
  BRANCH_PLATFORM_LAW_STATEMENTS,
} from '../branch/core/platformLaw';
import { createBranchSDK, resolveBranchEnabled } from '../branch/createBranchSDK';
import { createStubBranchAdapter } from '../branch/adapters/StubBranchAdapter';
import {
  BRANCH_SDK_FROZEN,
  BRANCH_SDK_MODULE,
  BRANCH_SDK_VERSION,
} from '../branch/version';
import {
  BRANCH_SDK_FROZEN as FROZEN_BARREL,
  BRANCH_SDK_MODULE as MODULE_BARREL,
  BRANCH_SDK_VERSION as VERSION_BARREL,
} from '../branch/types/index';
import type { BranchRepository } from '../branch/repository/BranchRepository';
import type { BranchAssignmentRepository } from '../branch/repository/BranchAssignmentRepository';
import type { TenantId } from '../core/types';
import type { BranchId } from '../branch/types/branded';
import {
  validateBranchAssignmentRequest,
  validateBranchEligibilityQuery,
  validateBranchListFilter,
  validateBranchSelectionQuery,
  validateBranchValidationInput,
} from '../branch/validation/validateBranchQuery';
import { branchNotConfiguredAsync } from '../branch/adapters/notConfigured';

const TENANT_ID = 'paradise' as TenantId;
const BRANCH_ID = 'paradise-hitech' as BranchId;
const CUSTOMER_POINT = { lat: 17.44, lng: 78.38 };

describe('BranchSDK foundation (M5 PR-1)', () => {
  it('exports BRANCH_SDK_VERSION as 1.0.0', () => {
    assert.equal(BRANCH_SDK_VERSION, '1.0.0');
    assert.equal(VERSION_BARREL, '1.0.0');
  });

  it('exports BRANCH_SDK_FROZEN as true', () => {
    assert.equal(BRANCH_SDK_FROZEN, true);
    assert.equal(FROZEN_BARREL, true);
  });

  it('exports BRANCH_SDK_MODULE as branch', () => {
    assert.equal(BRANCH_SDK_MODULE, 'branch');
    assert.equal(MODULE_BARREL, 'branch');
  });

  it('defaults all branch feature flags to off', () => {
    assert.equal(BRANCH_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_BRANCH_ENABLED, false);
    assert.equal(BRANCH_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_BRANCH_REPOSITORY_ENABLED, false);
    assert.equal(BRANCH_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_BRANCH_ASSIGNMENT_ENABLED, false);
    assert.equal(BRANCH_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_BRANCH_DISCOVERY_ENABLED, false);
    assert.equal(
      BRANCH_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED,
      false
    );
    assert.equal(BRANCH_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_BRANCH_OPERATIONS_SDK_ENABLED, false);
  });

  it('maps feature flags to VITE env keys', () => {
    assert.equal(BRANCH_SDK_FEATURE_FLAG_ENV_KEYS.FF_BRANCH_ENABLED, 'VITE_FF_BRANCH_ENABLED');
    assert.equal(
      BRANCH_SDK_FEATURE_FLAG_ENV_KEYS.FF_BRANCH_REPOSITORY_ENABLED,
      'VITE_FF_BRANCH_REPOSITORY_ENABLED'
    );
    assert.equal(
      BRANCH_SDK_FEATURE_FLAG_ENV_KEYS.FF_BRANCH_ASSIGNMENT_ENABLED,
      'VITE_FF_BRANCH_ASSIGNMENT_ENABLED'
    );
    assert.equal(
      BRANCH_SDK_FEATURE_FLAG_ENV_KEYS.FF_BRANCH_DISCOVERY_ENABLED,
      'VITE_FF_BRANCH_DISCOVERY_ENABLED'
    );
    assert.equal(
      BRANCH_SDK_FEATURE_FLAG_ENV_KEYS.FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED,
      'VITE_FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED'
    );
    assert.equal(
      BRANCH_SDK_FEATURE_FLAG_ENV_KEYS.FF_BRANCH_OPERATIONS_SDK_ENABLED,
      'VITE_FF_BRANCH_OPERATIONS_SDK_ENABLED'
    );
  });

  it('codifies the branch platform law', () => {
    assert.equal(BRANCH_PLATFORM_LAW.tenantRepresents, 'brand');
    assert.equal(BRANCH_PLATFORM_LAW.branchRepresents, 'fulfillment_unit');
    assert.equal(BRANCH_PLATFORM_LAW.customerInteractsWith, 'brand');
    assert.equal(BRANCH_PLATFORM_LAW.branchSelectionOwner, 'BranchSDK');
    assert.equal(BRANCH_PLATFORM_LAW_STATEMENTS.length, 5);
  });

  it('resolveBranchEnabled returns false by default', () => {
    assert.equal(resolveBranchEnabled(), false);
    assert.equal(resolveBranchEnabled({ featureFlags: () => true }), true);
  });

  it('createBranchSDK returns stub adapter with NOT_CONFIGURED methods', async () => {
    const sdk = createBranchSDK();
    const result = await sdk.findBestBranch({
      tenantId: TENANT_ID,
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('StubBranchAdapter overrideAssignment returns NOT_CONFIGURED', async () => {
    const sdk = createStubBranchAdapter();
    const result = await sdk.overrideAssignment({
      tenantId: TENANT_ID,
      branchId: BRANCH_ID,
      customerPoint: CUSTOMER_POINT,
      overriddenBy: 'customer',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('StubBranchAdapter validateBranch returns NOT_CONFIGURED', () => {
    const sdk = createStubBranchAdapter();
    const result = sdk.validateBranch({
      tenantId: TENANT_ID,
      branchId: BRANCH_ID,
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('validateBranchSelectionQuery rejects missing customer point', () => {
    const result = validateBranchSelectionQuery({
      tenantId: TENANT_ID,
      customerPoint: { lat: 0, lng: 0 },
      orderType: 'delivery',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'VALIDATION');
  });

  it('validateBranchSelectionQuery accepts a valid query', () => {
    const result = validateBranchSelectionQuery({
      tenantId: TENANT_ID,
      customerPoint: CUSTOMER_POINT,
      orderType: 'pickup',
    });
    assert.equal(result.ok, true);
  });

  it('validateBranchEligibilityQuery rejects empty tenantId', () => {
    const result = validateBranchEligibilityQuery({
      tenantId: '' as TenantId,
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    });
    assert.equal(result.ok, false);
  });

  it('validateBranchListFilter accepts tenant filter', () => {
    const result = validateBranchListFilter({ tenantId: TENANT_ID });
    assert.equal(result.ok, true);
  });

  it('validateBranchAssignmentRequest requires branchId', () => {
    const result = validateBranchAssignmentRequest({
      tenantId: TENANT_ID,
      branchId: '' as BranchId,
      customerPoint: CUSTOMER_POINT,
      reason: 'nearest_serviceable',
    });
    assert.equal(result.ok, false);
  });

  it('validateBranchValidationInput accepts valid input', () => {
    const result = validateBranchValidationInput({
      tenantId: TENANT_ID,
      branchId: BRANCH_ID,
      customerPoint: CUSTOMER_POINT,
      orderType: 'delivery',
    });
    assert.equal(result.ok, true);
  });

  it('defines BranchRepository port shape', () => {
    const repository: BranchRepository = {
      listBranches: async () => branchNotConfiguredAsync('listBranches', 'test'),
      getBranchById: async () => branchNotConfiguredAsync('getBranchById', 'test'),
      getBranchStatus: async () => branchNotConfiguredAsync('getBranchStatus', 'test'),
      getBranchHours: async () => branchNotConfiguredAsync('getBranchHours', 'test'),
      getBranchCapacity: async () => branchNotConfiguredAsync('getBranchCapacity', 'test'),
      getBranchInventory: async () => branchNotConfiguredAsync('getBranchInventory', 'test'),
      getRoutingPolicy: async () => branchNotConfiguredAsync('getRoutingPolicy', 'test'),
    };

    assert.equal(typeof repository.listBranches, 'function');
  });

  it('defines BranchAssignmentRepository port shape', () => {
    const repository: BranchAssignmentRepository = {
      writeAssignment: async () => branchNotConfiguredAsync('writeAssignment', 'test'),
      getAssignmentById: async () => branchNotConfiguredAsync('getAssignmentById', 'test'),
      supersedeAssignment: async () => branchNotConfiguredAsync('supersedeAssignment', 'test'),
    };

    assert.equal(typeof repository.writeAssignment, 'function');
  });
});

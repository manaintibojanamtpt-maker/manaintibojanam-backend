import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { sdkFail, sdkOk } from '../../sdk/core/resultHelpers';
import { sdkError } from '../../sdk/core/resultHelpers';
import type { TenantId } from '../../sdk/core/types';
import type { BranchId } from '../../sdk/branch/types/branded';
import type { BranchSDK } from '../../sdk/branch/contracts/BranchSDK';
import type { BranchOperationsSDK } from '../../sdk/branch/operations-sdk/contracts/BranchOperationsSDK';
import { createStubBranchAdapter } from '../../sdk/branch/adapters/StubBranchAdapter';
import { createStubBranchOperationsAdapter } from '../../sdk/branch/operations-sdk/StubBranchOperationsAdapter';
import type { BranchFacadeDeps } from '../branch/BranchFacade';
import {
  clearOwnerBranchSession,
  estimateOwnerBranchEta,
  getOwnerBranch,
  getOwnerBranchOperationalAvailability,
  getOwnerBranchSessionSnapshot,
  getOwnerBranchTelemetrySnapshot,
  isOwnerBranchEnabledDefault,
  listOwnerBranches,
  retryOwnerBranch,
  subscribeOwnerBranchSession,
  validateOwnerBranch,
} from '../owner-branches/OwnerBranchFacade';
import {
  resetOwnerBranchSession,
} from '../owner-branches/OwnerBranchSession';
import {
  resetOwnerBranchTelemetry,
} from '../owner-branches/OwnerBranchTelemetry';
import type { OwnerBranchTelemetryEvent } from '../owner-branches/OwnerBranchTelemetry';
import { buildOwnerBranchListQuery } from '../owner-branches/OwnerBranchContext';
import { ownerBranchFeatureDisabledError } from '../owner-branches/OwnerBranchErrorMapper';

const TENANT_ID = 'paradise' as TenantId;
const BRANCH_ID = 'paradise-hitech' as BranchId;
const CUSTOMER_POINT = { lat: 17.44, lng: 78.38 };

const BRANCH_SUMMARY = {
  branchId: BRANCH_ID,
  tenantId: TENANT_ID,
  name: 'Paradise — Hitech City',
  slug: 'hitech-city',
  status: 'active' as const,
  isDefault: true,
};

const BRANCH_DETAIL = {
  ...BRANCH_SUMMARY,
  location: { point: CUSTOMER_POINT, formattedAddress: 'Hitech City' },
};

const AVAILABILITY = {
  branchId: BRANCH_ID,
  enabled: true,
  isOperationallyAvailable: true,
  blockers: [] as readonly string[],
  hours: { status: 'open' as const, isOpen: true, reasons: [] as readonly string[] },
  capacity: {
    status: 'available' as const,
    isAvailable: true,
    activeOrders: 2,
    maxConcurrentOrders: 10,
    utilizationRatio: 0.2,
    reasons: [] as readonly string[],
  },
  inventory: {
    status: 'complete' as const,
    isSufficient: true,
    requestedCount: 0,
    unavailableCount: 0,
    missingItemIds: [] as readonly string[],
    reasons: [] as readonly string[],
  },
  operationalStatus: {
    isActive: true,
    status: 'active' as const,
    reasons: [] as readonly string[],
  },
  evaluatedAt: 1_700_000_000_000,
};

const createMockSdk = (overrides: Partial<BranchSDK> = {}): BranchSDK => ({
  ...createStubBranchAdapter(),
  listBranches: async () => sdkOk([BRANCH_SUMMARY]),
  getBranch: async () => sdkOk(BRANCH_DETAIL),
  validateBranch: () =>
    sdkOk({
      branchId: BRANCH_ID,
      isValid: true,
      eligibility: {
        branchId: BRANCH_ID,
        isEligible: true,
        status: 'serviceable',
        distanceKm: 1.2,
        maxRadiusKm: 10,
        reasons: [],
      },
      issues: [],
    }),
  estimateETA: async () =>
    sdkOk({
      branchId: BRANCH_ID,
      prepTimeMins: 12,
      deliveryTimeMins: 6,
      totalMins: 18,
      confidence: 'high',
    }),
  ...overrides,
});

const createMockOperationsSdk = (
  overrides: Partial<BranchOperationsSDK> = {}
): BranchOperationsSDK => ({
  ...createStubBranchOperationsAdapter(),
  getOperationalAvailability: async () => sdkOk(AVAILABILITY),
  ...overrides,
});

const createEnabledOwnerDeps = (
  overrides: Partial<BranchFacadeDeps> = {}
): { isOwnerBranchEnabled: () => boolean; branchFacade: BranchFacadeDeps } => ({
  isOwnerBranchEnabled: () => true,
  branchFacade: {
    isEnabled: () => true,
    sdk: createMockSdk(),
    operationsSdk: createMockOperationsSdk(),
    ...overrides,
  },
});

describe('OwnerBranchFacade (M5 PR-13)', () => {
  beforeEach(() => {
    resetOwnerBranchSession();
    resetOwnerBranchTelemetry();
  });

  it('isOwnerBranchEnabledDefault returns false', () => {
    assert.equal(isOwnerBranchEnabledDefault(), false);
  });

  it('returns disabled outcome when FF_BRANCH_OWNER_ENABLED is off', async () => {
    const outcome = await listOwnerBranches(
      { tenantId: TENANT_ID },
      {
        isOwnerBranchEnabled: () => false,
        branchFacade: createEnabledOwnerDeps().branchFacade,
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.featureDisabled, true);
    assert.equal(getOwnerBranchSessionSnapshot().status, 'disabled');
  });

  it('lists owner branches through BranchFacade', async () => {
    const outcome = await listOwnerBranches({ tenantId: TENANT_ID }, createEnabledOwnerDeps());

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(String(outcome.branches[0]?.branchId), 'paradise-hitech');
    assert.equal(getOwnerBranchSessionSnapshot().status, 'success');
  });

  it('gets owner branch detail through BranchFacade', async () => {
    const outcome = await getOwnerBranch({ branchId: BRANCH_ID }, createEnabledOwnerDeps());

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.branch.name, 'Paradise — Hitech City');
  });

  it('gets operational availability through BranchFacade', async () => {
    const outcome = await getOwnerBranchOperationalAvailability(
      {
        branchId: BRANCH_ID,
        tenantId: TENANT_ID,
        branchName: 'Paradise — Hitech City',
      },
      createEnabledOwnerDeps()
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.availability.isOperationallyAvailable, true);
    assert.equal(getOwnerBranchSessionSnapshot().lastOperation, 'getOperationalAvailability');
  });

  it('validates owner branch through BranchFacade', () => {
    const outcome = validateOwnerBranch(
      {
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
      },
      createEnabledOwnerDeps()
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.validation.isValid, true);
  });

  it('estimates owner branch ETA through BranchFacade', async () => {
    const outcome = await estimateOwnerBranchEta(
      {
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
      },
      createEnabledOwnerDeps()
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.estimate.totalMins, 18);
  });

  it('maps NOT_CONFIGURED from BranchFacade', async () => {
    const outcome = await listOwnerBranches(
      { tenantId: TENANT_ID },
      {
        isOwnerBranchEnabled: () => true,
        branchFacade: {
          isEnabled: () => false,
          sdk: createMockSdk(),
        },
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'NOT_CONFIGURED');
  });

  it('maps UNAVAILABLE from BranchFacade operations path', async () => {
    const outcome = await getOwnerBranchOperationalAvailability(
      { branchId: BRANCH_ID, tenantId: TENANT_ID },
      {
        isOwnerBranchEnabled: () => true,
        branchFacade: {
          isEnabled: () => true,
          sdk: createMockSdk(),
          operationsSdk: createMockOperationsSdk({
            getOperationalAvailability: async () =>
              sdkFail(
                sdkError('UNAVAILABLE', 'Repository unavailable', {
                  branchCode: 'REPOSITORY_UNAVAILABLE',
                })
              ),
          }),
        },
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'UNAVAILABLE');
    assert.equal(getOwnerBranchSessionSnapshot().status, 'error');
  });

  it('validates tenantId before calling BranchFacade', async () => {
    const outcome = await listOwnerBranches(
      { tenantId: '' as TenantId },
      createEnabledOwnerDeps({
        listBranches: async () => {
          throw new Error('BranchFacade must not be called');
        },
      } as never)
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'VALIDATION');
  });

  it('retries the last owner branch request', async () => {
    let calls = 0;
    const deps = {
      isOwnerBranchEnabled: () => true,
      branchFacade: {
        isEnabled: () => true,
        sdk: createMockSdk({
          listBranches: async () => {
            calls += 1;
            if (calls === 1) {
              return sdkFail(sdkError('UNAVAILABLE', 'temporary', { retryable: true }));
            }
            return sdkOk([BRANCH_SUMMARY]);
          },
        }),
        operationsSdk: createMockOperationsSdk(),
      },
    };

    const first = await listOwnerBranches({ tenantId: TENANT_ID }, deps);
    assert.equal(first.ok, false);

    const retried = await retryOwnerBranch(deps);
    assert.equal(retried.ok, true);
    assert.equal(calls, 2);
  });

  it('clears owner branch session', async () => {
    await listOwnerBranches({ tenantId: TENANT_ID }, createEnabledOwnerDeps());
    clearOwnerBranchSession();
    assert.equal(getOwnerBranchSessionSnapshot().status, 'idle');
  });

  it('emits owner branch telemetry events', async () => {
    const events: OwnerBranchTelemetryEvent[] = [];

    await getOwnerBranch(
      { branchId: BRANCH_ID },
      {
        ...createEnabledOwnerDeps(),
        onTelemetry: (event) => events.push(event),
      }
    );

    assert.ok(events.some((event) => event.type === 'request'));
    assert.ok(events.some((event) => event.type === 'success'));
    assert.ok(getOwnerBranchTelemetrySnapshot().totalMs !== null);
  });

  it('builds owner branch list query deterministically', () => {
    const query = buildOwnerBranchListQuery({ tenantId: TENANT_ID, limit: 5 });
    assert.equal(String(query.tenantId), 'paradise');
    assert.equal(query.limit, 5);
  });

  it('notifies owner branch session subscribers', async () => {
    const statuses: string[] = [];
    subscribeOwnerBranchSession((snapshot) => statuses.push(snapshot.status));

    await listOwnerBranches({ tenantId: TENANT_ID }, createEnabledOwnerDeps());

    assert.ok(statuses.includes('loading'));
    assert.ok(statuses.includes('success'));
  });

  it('ownerBranchFeatureDisabledError has expected shape', () => {
    const error = ownerBranchFeatureDisabledError();
    assert.equal(error.featureDisabled, true);
    assert.equal(error.retryable, false);
  });
});

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { sdkOk } from '../../sdk/core/resultHelpers';
import type { TenantId } from '../../sdk/core/types';
import type { BranchId } from '../../sdk/branch/types/branded';
import type { BranchSDK } from '../../sdk/branch/contracts/BranchSDK';
import { createStubBranchAdapter } from '../../sdk/branch/adapters/StubBranchAdapter';
import {
  branchFeatureDisabledError,
  findEligibleBranches,
  getBranch,
  listBranches,
  estimateETA,
  normalizeBranchError,
  resetSession,
  retry,
  subscribeSession,
  validateBranch,
} from '../branch/BranchFacade';
import {
  getBranchSessionSnapshot,
  resetBranchSession,
} from '../branch/BranchSession';
import {
  getBranchTelemetrySnapshot,
  resetBranchTelemetry,
} from '../branch/BranchTelemetry';
import type { BranchPresentationTelemetryEvent } from '../branch/types';
import type { CustomerCanonicalLocation } from '../customerLocation/types';

const TENANT_ID = 'paradise' as TenantId;
const BRANCH_ID = 'paradise-hitech' as BranchId;
const CUSTOMER_POINT = { lat: 17.44, lng: 78.38 };

const CUSTOMER_LOCATION: CustomerCanonicalLocation = {
  country: 'IN',
  lat: 17.44,
  lng: 78.38,
  accuracyM: 10,
  geohash: 'tepg9',
  formattedAddress: 'Hyderabad',
  coordinateSource: 'gps',
  detectedAt: Date.now(),
};

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

const createMockSdk = (overrides: Partial<BranchSDK> = {}): BranchSDK => ({
  ...createStubBranchAdapter(),
  listBranches: async () => sdkOk([BRANCH_SUMMARY]),
  getBranch: async () => sdkOk(BRANCH_DETAIL),
  findEligibleBranches: async () =>
    sdkOk([
      {
        branchId: BRANCH_ID,
        name: BRANCH_SUMMARY.name,
        distanceKm: 1.2,
        eligibility: {
          branchId: BRANCH_ID,
          isEligible: true,
          status: 'serviceable',
          distanceKm: 1.2,
          maxRadiusKm: 10,
          reasons: [],
        },
      },
    ]),
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

describe('BranchFacade (M5 PR-5)', () => {
  beforeEach(() => {
    resetBranchSession();
    resetBranchTelemetry();
  });

  it('returns disabled outcome when FF_BRANCH_ENABLED is off', async () => {
    const outcome = await listBranches(
      { tenantId: TENANT_ID },
      {
        isEnabled: () => false,
        sdk: createMockSdk(),
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.featureDisabled, true);
    assert.equal(getBranchSessionSnapshot().status, 'disabled');
  });

  it('orchestrates listBranches through BranchSDK', async () => {
    const outcome = await listBranches(
      { tenantId: TENANT_ID },
      {
        isEnabled: () => true,
        sdk: createMockSdk(),
      }
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(String(outcome.branches[0]?.branchId), 'paradise-hitech');
    assert.equal(getBranchSessionSnapshot().status, 'success');
  });

  it('orchestrates getBranch through BranchSDK', async () => {
    const outcome = await getBranch(
      { branchId: BRANCH_ID },
      {
        isEnabled: () => true,
        sdk: createMockSdk(),
      }
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.branch.name, 'Paradise — Hitech City');
  });

  it('orchestrates findEligibleBranches with customer session', async () => {
    const outcome = await findEligibleBranches(
      { tenantId: TENANT_ID, orderType: 'delivery' },
      {
        isEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk(),
      }
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.candidates.length, 1);
    assert.equal(outcome.candidates[0]?.score, undefined);
  });

  it('orchestrates validateBranch synchronously', () => {
    const outcome = validateBranch(
      {
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
      },
      {
        isEnabled: () => true,
        sdk: createMockSdk(),
      }
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.validation.isValid, true);
  });

  it('orchestrates estimateETA through BranchSDK', async () => {
    const outcome = await estimateETA(
      {
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
      },
      {
        isEnabled: () => true,
        sdk: createMockSdk(),
      }
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.estimate.totalMins, 18);
  });

  it('marks empty session when no branches are returned', async () => {
    const outcome = await listBranches(
      { tenantId: TENANT_ID },
      {
        isEnabled: () => true,
        sdk: createMockSdk({ listBranches: async () => sdkOk([]) }),
      }
    );

    assert.equal(outcome.ok, true);
    assert.equal(getBranchSessionSnapshot().status, 'empty');
  });

  it('maps SDK errors to presentation errors', async () => {
    const outcome = await getBranch(
      { branchId: BRANCH_ID },
      {
        isEnabled: () => true,
        sdk: createMockSdk({
          getBranch: async () => ({
            ok: false,
            error: { code: 'NOT_FOUND', message: 'Branch not found' },
          }),
        }),
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'NOT_FOUND');
    assert.equal(getBranchSessionSnapshot().status, 'error');
  });

  it('retries the last branch request', async () => {
    await listBranches(
      { tenantId: TENANT_ID },
      { isEnabled: () => true, sdk: createMockSdk() }
    );

    const retried = await retry({
      isEnabled: () => true,
      sdk: createMockSdk(),
    });

    assert.equal(retried.ok, true);
    assert.equal(getBranchSessionSnapshot().lastOperation, 'listBranches');
  });

  it('rejects retry when no prior request exists', async () => {
    const retried = await retry({
      isEnabled: () => true,
      sdk: createMockSdk(),
    });

    assert.equal(retried.ok, false);
    if (retried.ok) return;
    assert.equal(retried.error.code, 'VALIDATION');
  });

  it('resets session state', async () => {
    await listBranches(
      { tenantId: TENANT_ID },
      { isEnabled: () => true, sdk: createMockSdk() }
    );

    resetSession();
    assert.equal(getBranchSessionSnapshot().status, 'idle');
  });

  it('notifies session subscribers', async () => {
    const statuses: string[] = [];
    const unsubscribe = subscribeSession((snapshot) => {
      statuses.push(snapshot.status);
    });

    await listBranches(
      { tenantId: TENANT_ID },
      { isEnabled: () => true, sdk: createMockSdk() }
    );

    unsubscribe();
    assert.ok(statuses.includes('loading'));
    assert.ok(statuses.includes('success'));
  });

  it('emits telemetry events through optional hook', async () => {
    const events: BranchPresentationTelemetryEvent[] = [];

    await listBranches(
      { tenantId: TENANT_ID },
      {
        isEnabled: () => true,
        sdk: createMockSdk(),
        onTelemetry: (event) => events.push(event),
      }
    );

    assert.ok(events.some((event) => event.type === 'request'));
    assert.ok(events.some((event) => event.type === 'success'));
    assert.ok(getBranchTelemetrySnapshot().totalMs !== null);
  });

  it('normalizeBranchError maps retryable UNAVAILABLE errors', () => {
    const mapped = normalizeBranchError({
      code: 'UNAVAILABLE',
      message: 'Repository unavailable',
    });
    assert.equal(mapped.retryable, true);
  });

  it('branchFeatureDisabledError marks feature disabled', () => {
    const error = branchFeatureDisabledError();
    assert.equal(error.featureDisabled, true);
  });
});

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { sdkFail, sdkOk, sdkError } from '../../sdk/core/resultHelpers';
import type { TenantId } from '../../sdk/core/types';
import type { BranchId } from '../../sdk/branch/types/branded';
import type { BranchSDK } from '../../sdk/branch/contracts/BranchSDK';
import { createStubBranchAdapter } from '../../sdk/branch/adapters/StubBranchAdapter';
import {
  cancelCheckoutBranchAssignment,
  clearCheckoutBranchSession,
  getCheckoutBranchSessionSnapshot,
  getCheckoutBranchTelemetrySnapshot,
  resolveCheckoutBranch,
  retryCheckoutBranchAssignment,
  subscribeCheckoutBranchSession,
} from '../checkout/CheckoutBranchFacade';
import {
  resetCheckoutBranchSession,
} from '../checkout/CheckoutBranchSession';
import {
  resetCheckoutBranchTelemetry,
} from '../checkout/CheckoutBranchTelemetry';
import type { CheckoutBranchTelemetryEvent } from '../checkout/CheckoutBranchTelemetry';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import { findBestBranch } from '../branch/BranchFacade';
import { resetBranchSession } from '../branch/BranchSession';
import { resetBranchTelemetry } from '../branch/BranchTelemetry';

const TENANT_ID = 'paradise' as TenantId;
const BRANCH_ID = 'paradise-hitech' as BranchId;
const BRANCH_PREFERRED = 'paradise-banjara' as BranchId;
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

const ASSIGNMENT = {
  assignmentId: 'assign-paradise-hitech-0' as never,
  tenantId: TENANT_ID,
  branchId: BRANCH_ID,
  branchName: 'Paradise — Hitech City',
  reason: 'nearest_serviceable' as const,
  score: {
    total: 0.82,
    distance: 0.9,
    eta: 0.8,
    deliveryFee: 0.7,
    capacityHeadroom: 0.85,
    inventoryAvailability: 1,
    openStatus: 1,
  },
  eligibility: {
    branchId: BRANCH_ID,
    isEligible: true,
    status: 'serviceable' as const,
    distanceKm: 1.2,
    maxRadiusKm: 10,
    reasons: [],
  },
  assignedAt: 0,
  overrideApplied: false,
};

const PREFERRED_ASSIGNMENT = {
  ...ASSIGNMENT,
  assignmentId: 'assign-paradise-banjara-0' as never,
  branchId: BRANCH_PREFERRED,
  branchName: 'Paradise — Banjara Hills',
  reason: 'default_branch' as const,
  eligibility: {
    ...ASSIGNMENT.eligibility,
    branchId: BRANCH_PREFERRED,
  },
};

const createMockSdk = (overrides: Partial<BranchSDK> = {}): BranchSDK => ({
  ...createStubBranchAdapter(),
  findBestBranch: async () => sdkOk(ASSIGNMENT),
  ...overrides,
});

describe('CheckoutBranchFacade (M5 PR-8)', () => {
  beforeEach(() => {
    resetCheckoutBranchSession();
    resetCheckoutBranchTelemetry();
    resetBranchSession();
    resetBranchTelemetry();
  });

  it('uses legacy checkout path when FF_BRANCH_CHECKOUT_ENABLED is off', async () => {
    const outcome = await resolveCheckoutBranch(
      {
        tenantId: TENANT_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
        cartItemIds: ['biryani-veg'],
      },
      {
        isCheckoutBranchEnabled: () => false,
        branchFacade: {
          isEnabled: () => true,
          sdk: createMockSdk({
            findBestBranch: async () => {
              throw new Error('BranchSDK must not be called when checkout flag is off');
            },
          }),
        },
      }
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.legacy, true);
    assert.equal(outcome.assignment, null);
    assert.equal(getCheckoutBranchSessionSnapshot().status, 'legacy');
  });

  it('resolves branch assignment successfully before payment', async () => {
    const outcome = await resolveCheckoutBranch(
      {
        tenantId: TENANT_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
        cartItemIds: ['biryani-veg'],
        correlationId: 'checkout-123',
      },
      {
        isCheckoutBranchEnabled: () => true,
        branchFacade: {
          isEnabled: () => true,
          sdk: createMockSdk(),
          readCustomerLocation: () => CUSTOMER_LOCATION,
        },
      }
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok || outcome.legacy) return;
    assert.equal(String(outcome.assignment.branchId), 'paradise-hitech');
    assert.equal(outcome.summary.branchName, 'Paradise — Hitech City');
    assert.equal(outcome.context.correlationId, 'checkout-123');
    assert.equal(getCheckoutBranchSessionSnapshot().status, 'assigned');
    assert.equal(getCheckoutBranchSessionSnapshot().context.legacy, false);
  });

  it('returns no eligible branch when assignment fails', async () => {
    const outcome = await resolveCheckoutBranch(
      {
        tenantId: TENANT_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
      },
      {
        isCheckoutBranchEnabled: () => true,
        branchFacade: {
          isEnabled: () => true,
          sdk: createMockSdk({
            findBestBranch: async () =>
              sdkFail(
                sdkError('VALIDATION', 'No eligible branch found for assignment', {
                  branchCode: 'NO_ELIGIBLE_BRANCH',
                })
              ),
          }),
        },
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.noEligibleBranch, true);
    assert.equal(outcome.error.assignmentRejected, true);
    assert.equal(getCheckoutBranchSessionSnapshot().status, 'rejected');
  });

  it('honours preferred branch via BranchFacade', async () => {
    const outcome = await resolveCheckoutBranch(
      {
        tenantId: TENANT_ID,
        orderType: 'pickup',
        customerPoint: CUSTOMER_POINT,
        preferredBranchId: BRANCH_PREFERRED,
      },
      {
        isCheckoutBranchEnabled: () => true,
        branchFacade: {
          isEnabled: () => true,
          sdk: createMockSdk({
            findBestBranch: async (query) => {
              assert.equal(String(query.preferredBranchId), 'paradise-banjara');
              return sdkOk(PREFERRED_ASSIGNMENT);
            },
          }),
        },
      }
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok || outcome.legacy) return;
    assert.equal(String(outcome.assignment.branchId), 'paradise-banjara');
    assert.equal(outcome.summary.reason, 'default_branch');
  });

  it('rejects assignment when BranchSDK returns NOT_CONFIGURED', async () => {
    const outcome = await resolveCheckoutBranch(
      {
        tenantId: TENANT_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
      },
      {
        isCheckoutBranchEnabled: () => true,
        branchFacade: {
          isEnabled: () => true,
          sdk: createMockSdk({
            findBestBranch: async () =>
              sdkFail(sdkError('NOT_CONFIGURED', 'findBestBranch is not configured')),
          }),
        },
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.assignmentRejected, true);
    assert.equal(getCheckoutBranchSessionSnapshot().status, 'rejected');
  });

  it('retries the last checkout branch request', async () => {
    let calls = 0;
    const sdk = createMockSdk({
      findBestBranch: async () => {
        calls += 1;
        if (calls === 1) {
          return sdkFail(sdkError('UNAVAILABLE', 'temporary outage', { retryable: true }));
        }
        return sdkOk(ASSIGNMENT);
      },
    });

    const deps = {
      isCheckoutBranchEnabled: () => true,
      branchFacade: { isEnabled: () => true, sdk },
    };

    const first = await resolveCheckoutBranch(
      { tenantId: TENANT_ID, orderType: 'delivery', customerPoint: CUSTOMER_POINT },
      deps
    );
    assert.equal(first.ok, false);

    const retried = await retryCheckoutBranchAssignment(deps);
    assert.equal(retried.ok, true);
    assert.equal(calls, 2);
    assert.equal(getCheckoutBranchSessionSnapshot().status, 'assigned');
  });

  it('cancels checkout branch assignment session', async () => {
    await resolveCheckoutBranch(
      {
        tenantId: TENANT_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
      },
      {
        isCheckoutBranchEnabled: () => true,
        branchFacade: { isEnabled: () => true, sdk: createMockSdk() },
      }
    );

    const snapshot = cancelCheckoutBranchAssignment();
    assert.equal(snapshot.status, 'cancelled');
    assert.equal(snapshot.context.assignment, null);
  });

  it('emits checkout branch telemetry events', async () => {
    const events: CheckoutBranchTelemetryEvent[] = [];

    await resolveCheckoutBranch(
      {
        tenantId: TENANT_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
      },
      {
        isCheckoutBranchEnabled: () => true,
        onTelemetry: (event) => events.push(event),
        branchFacade: { isEnabled: () => true, sdk: createMockSdk() },
      }
    );

    assert.ok(events.some((event) => event.type === 'request'));
    assert.ok(events.some((event) => event.type === 'success'));
    assert.ok(getCheckoutBranchTelemetrySnapshot().totalMs !== null);
  });

  it('validates checkout query before calling BranchFacade', async () => {
    let called = false;
    const outcome = await resolveCheckoutBranch(
      { tenantId: '' as TenantId, orderType: 'delivery' },
      {
        isCheckoutBranchEnabled: () => true,
        branchFacade: {
          isEnabled: () => true,
          sdk: createMockSdk({
            findBestBranch: async () => {
              called = true;
              return sdkOk(ASSIGNMENT);
            },
          }),
        },
      }
    );

    assert.equal(outcome.ok, false);
    assert.equal(called, false);
  });

  it('clears checkout branch session', async () => {
    await resolveCheckoutBranch(
      {
        tenantId: TENANT_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
      },
      {
        isCheckoutBranchEnabled: () => true,
        branchFacade: { isEnabled: () => true, sdk: createMockSdk() },
      }
    );

    clearCheckoutBranchSession();
    assert.equal(getCheckoutBranchSessionSnapshot().status, 'idle');
  });

  it('notifies session subscribers', async () => {
    const statuses: string[] = [];
    subscribeCheckoutBranchSession((snapshot) => statuses.push(snapshot.status));

    await resolveCheckoutBranch(
      {
        tenantId: TENANT_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
      },
      {
        isCheckoutBranchEnabled: () => true,
        branchFacade: { isEnabled: () => true, sdk: createMockSdk() },
      }
    );

    assert.ok(statuses.includes('loading'));
    assert.ok(statuses.includes('assigned'));
  });

  it('delegates findBestBranch through BranchFacade layer', async () => {
    const outcome = await findBestBranch(
      {
        tenantId: TENANT_ID,
        orderType: 'delivery',
        customerPoint: CUSTOMER_POINT,
      },
      {
        isEnabled: () => true,
        sdk: createMockSdk(),
        readCustomerLocation: () => CUSTOMER_LOCATION,
      }
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(String(outcome.assignment.branchId), 'paradise-hitech');
  });
});

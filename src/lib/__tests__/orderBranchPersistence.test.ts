import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { TenantId } from '../../sdk/core/types';
import type { BranchId } from '../../sdk/branch/types/branded';
import type { CheckoutBranchContextSnapshot } from '../checkout/CheckoutBranchContext';
import { attachCheckoutBranchAssignment, createLegacyCheckoutBranchContext } from '../checkout/CheckoutBranchContext';
import {
  isOrderBranchPersistenceEnabledDefault,
  persistOrderBranchMetadata,
  resolveOrderBranchPersistence,
  ORDER_BRANCH_ASSIGNMENT_ALGORITHM_VERSION,
  ORDER_BRANCH_POLICY_VERSION,
} from '../orders/OrderBranchPersistence';
import {
  mapCheckoutContextToOrderBranchFields,
  mergeOrderBranchFields,
} from '../orders/OrderBranchMapper';
import {
  validateLegacyCheckoutContext,
  validateOrderBranchPersistenceInput,
} from '../orders/OrderBranchValidation';
import {
  getOrderBranchTelemetrySnapshot,
  resetOrderBranchTelemetry,
} from '../orders/OrderBranchTelemetry';
import type { OrderBranchTelemetryEvent } from '../orders/OrderBranchTelemetry';

const TENANT_ID = 'paradise' as TenantId;
const BRANCH_ID = 'paradise-hitech' as BranchId;

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
  assignedAt: 1_700_000_000_000,
  overrideApplied: false,
};

const ASSIGNED_CONTEXT: CheckoutBranchContextSnapshot = attachCheckoutBranchAssignment(
  ASSIGNMENT,
  'checkout-123'
);

const BASE_ORDER = {
  tenantId: TENANT_ID,
  totalAmount: 499,
  items: [{ menuItemId: 'biryani-veg', qty: 1 }],
};

describe('Order branch persistence (M5 PR-9)', () => {
  beforeEach(() => {
    resetOrderBranchTelemetry();
  });

  it('isOrderBranchPersistenceEnabledDefault returns false', () => {
    assert.equal(isOrderBranchPersistenceEnabledDefault(), false);
  });

  it('skips persistence when FF_BRANCH_ORDER_PERSISTENCE_ENABLED is off', () => {
    const result = resolveOrderBranchPersistence(
      BASE_ORDER,
      { tenantId: TENANT_ID, checkoutContext: ASSIGNED_CONTEXT },
      { isEnabled: () => false }
    );

    assert.equal(result.ok, true);
    if (!result.ok || !('skipped' in result)) return;
    assert.equal(result.skipped, true);
    assert.equal(result.enrichedOrder.branchId, undefined);
  });

  it('persists branch metadata when assignment is present', () => {
    const result = resolveOrderBranchPersistence(
      BASE_ORDER,
      { tenantId: TENANT_ID, checkoutContext: ASSIGNED_CONTEXT },
      { isEnabled: () => true }
    );

    assert.equal(result.ok, true);
    if (!result.ok || 'skipped' in result) return;
    assert.equal(result.legacy, false);
    assert.equal(result.enrichedOrder.branchId, 'paradise-hitech');
    assert.equal(result.enrichedOrder.branchAssignmentId, 'assign-paradise-hitech-0');
    assert.equal(result.enrichedOrder.branchAssignmentReason, 'nearest_serviceable');
    assert.equal(result.enrichedOrder.branchAssignmentAlgorithmVersion, ORDER_BRANCH_ASSIGNMENT_ALGORITHM_VERSION);
    assert.equal(result.enrichedOrder.branchAssignmentPolicyVersion, ORDER_BRANCH_POLICY_VERSION);
    assert.equal(typeof result.enrichedOrder.branchAssignmentGeneratedAt, 'number');
  });

  it('rejects persistence when assignment is missing on non-legacy checkout', () => {
    const context: CheckoutBranchContextSnapshot = {
      assignment: null,
      summary: null,
      resolvedAt: null,
      correlationId: null,
      legacy: false,
    };

    const result = resolveOrderBranchPersistence(
      BASE_ORDER,
      { tenantId: TENANT_ID, checkoutContext: context },
      { isEnabled: () => true }
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'MISSING_ASSIGNMENT');
  });

  it('supports legacy checkout with tenantId as branchId', () => {
    const legacyContext = createLegacyCheckoutBranchContext();
    const result = resolveOrderBranchPersistence(
      BASE_ORDER,
      { tenantId: TENANT_ID, checkoutContext: legacyContext },
      { isEnabled: () => true }
    );

    assert.equal(result.ok, true);
    if (!result.ok || 'skipped' in result) return;
    assert.equal(result.legacy, true);
    assert.equal(result.enrichedOrder.branchId, TENANT_ID);
    assert.equal(result.enrichedOrder.branchAssignmentId, undefined);
  });

  it('maps checkout context to order branch fields', () => {
    const fields = mapCheckoutContextToOrderBranchFields(TENANT_ID, ASSIGNED_CONTEXT);
    assert.equal('legacy' in fields, false);
    if ('legacy' in fields) return;
    assert.equal(fields.branchId, 'paradise-hitech');
    assert.equal(fields.assignmentId, 'assign-paradise-hitech-0');
    assert.equal(fields.assignmentReason, 'nearest_serviceable');
    assert.equal(fields.algorithmVersion, ORDER_BRANCH_ASSIGNMENT_ALGORITHM_VERSION);
    assert.equal(fields.policyVersion, ORDER_BRANCH_POLICY_VERSION);
  });

  it('validates tenant mismatch between order and assignment', () => {
    const error = validateOrderBranchPersistenceInput({
      tenantId: 'other-tenant',
      checkoutContext: ASSIGNED_CONTEXT,
    });

    assert.ok(error);
    assert.equal(error?.code, 'TENANT_MISMATCH');
  });

  it('validates legacy checkout context', () => {
    assert.equal(validateLegacyCheckoutContext(createLegacyCheckoutBranchContext()), null);
    assert.ok(
      validateLegacyCheckoutContext({
        assignment: null,
        summary: null,
        resolvedAt: null,
        correlationId: null,
        legacy: false,
      })
    );
  });

  it('writes branch metadata through mock order persistence port', async () => {
    const writes: Array<{ orderId: string; fields: unknown }> = [];

    const result = await persistOrderBranchMetadata(
      'order-123',
      BASE_ORDER,
      { tenantId: TENANT_ID, checkoutContext: ASSIGNED_CONTEXT },
      {
        writeBranchMetadata: async (orderId, fields) => {
          writes.push({ orderId, fields });
        },
      },
      { isEnabled: () => true }
    );

    assert.equal(result.ok, true);
    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.orderId, 'order-123');
    assert.equal((writes[0]?.fields as { branchId: string }).branchId, 'paradise-hitech');
  });

  it('does not write when persistence flag is off', async () => {
    let writes = 0;

    await persistOrderBranchMetadata(
      'order-123',
      BASE_ORDER,
      { tenantId: TENANT_ID, checkoutContext: ASSIGNED_CONTEXT },
      {
        writeBranchMetadata: async () => {
          writes += 1;
        },
      },
      { isEnabled: () => false }
    );

    assert.equal(writes, 0);
  });

  it('emits order branch persistence telemetry', () => {
    const events: OrderBranchTelemetryEvent[] = [];

    resolveOrderBranchPersistence(
      BASE_ORDER,
      { tenantId: TENANT_ID, checkoutContext: ASSIGNED_CONTEXT },
      {
        isEnabled: () => true,
        onTelemetry: (event) => events.push(event),
      }
    );

    assert.ok(events.some((event) => event.type === 'persist_request'));
    assert.ok(events.some((event) => event.type === 'persist_success'));
    assert.ok(getOrderBranchTelemetrySnapshot().totalMs !== null);
  });

  it('records skipped telemetry when flag is off', () => {
    const events: OrderBranchTelemetryEvent[] = [];

    resolveOrderBranchPersistence(
      BASE_ORDER,
      { tenantId: TENANT_ID, checkoutContext: ASSIGNED_CONTEXT },
      {
        isEnabled: () => false,
        onTelemetry: (event) => events.push(event),
      }
    );

    assert.ok(events.some((event) => event.type === 'persist_skipped'));
  });

  it('mergeOrderBranchFields leaves order unchanged when fields are null', () => {
    const merged = mergeOrderBranchFields(BASE_ORDER, null);
    assert.deepEqual(merged, BASE_ORDER);
  });
});

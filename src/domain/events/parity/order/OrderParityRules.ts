/** Order parity comparison rules (M6 PR-8). Pure domain — no SDK imports. */

import type { OrderCanonicalLineItem, OrderCanonicalModel } from './OrderCanonicalModel';
import { createFieldDifference } from './OrderParityDifference';
import type { OrderParityDifference } from './OrderParityDifference';
import type { OrderParityOutcome, OrderParityResult } from './OrderParityResult';

export const COMPARABLE_ORDER_PARITY_FIELDS = [
  'orderId',
  'tenantId',
  'status',
  'branchId',
  'customerId',
  'currency',
  'totalAmount',
  'createdAt',
  'updatedAt',
  'version',
  'lineItems',
] as const;

export type ComparableOrderParityField = (typeof COMPARABLE_ORDER_PARITY_FIELDS)[number];

/** Fields ignored during parity — projection/telemetry/checkpoint metadata. */
export const IGNORED_PARITY_METADATA_FIELDS = [
  'projectionVersion',
  'snapshotId',
  'capturedAt',
  'lastEventId',
  'lastEventType',
  'correlationId',
  'telemetry',
  'checkpoint',
  'checkpointSequence',
  'consumerGroup',
] as const;

const LINE_ITEM_COMPARE_FIELDS: (keyof OrderCanonicalLineItem)[] = [
  'menuItemId',
  'name',
  'quantity',
  'lineTotal',
];

function compareOptionalString(legacy?: string, projection?: string): boolean {
  const l = legacy ?? undefined;
  const p = projection ?? undefined;
  return l === p;
}

function compareLineItems(
  legacy: readonly OrderCanonicalLineItem[],
  projection: readonly OrderCanonicalLineItem[]
): OrderParityDifference[] {
  const differences: OrderParityDifference[] = [];
  if (legacy.length !== projection.length) {
    differences.push(
      createFieldDifference('lineItems.length', legacy.length, projection.length, 'FIELD_MISMATCH')
    );
    return differences;
  }

  for (let i = 0; i < legacy.length; i++) {
    const left = legacy[i]!;
    const right = projection[i]!;
    for (const field of LINE_ITEM_COMPARE_FIELDS) {
      if (left[field] !== right[field]) {
        differences.push(
          createFieldDifference(`lineItems[${i}].${field}`, left[field], right[field], 'FIELD_MISMATCH')
        );
      }
    }
  }
  return differences;
}

function compareCanonicalFields(
  legacy: OrderCanonicalModel,
  projection: OrderCanonicalModel
): OrderParityDifference[] {
  const differences: OrderParityDifference[] = [];

  if (legacy.orderId !== projection.orderId) {
    differences.push(createFieldDifference('orderId', legacy.orderId, projection.orderId));
  }
  if (legacy.tenantId !== projection.tenantId) {
    differences.push(createFieldDifference('tenantId', legacy.tenantId, projection.tenantId));
  }
  if (legacy.status !== projection.status) {
    differences.push(createFieldDifference('status', legacy.status, projection.status));
  }
  if (!compareOptionalString(legacy.branchId, projection.branchId)) {
    differences.push(createFieldDifference('branchId', legacy.branchId, projection.branchId));
  }
  if (!compareOptionalString(legacy.customerId, projection.customerId)) {
    differences.push(createFieldDifference('customerId', legacy.customerId, projection.customerId));
  }
  if (legacy.currency !== projection.currency) {
    differences.push(createFieldDifference('currency', legacy.currency, projection.currency));
  }
  if (legacy.totalAmount !== projection.totalAmount) {
    differences.push(createFieldDifference('totalAmount', legacy.totalAmount, projection.totalAmount));
  }
  if (legacy.createdAt !== projection.createdAt) {
    differences.push(createFieldDifference('createdAt', legacy.createdAt, projection.createdAt));
  }
  if (legacy.updatedAt !== projection.updatedAt) {
    differences.push(createFieldDifference('updatedAt', legacy.updatedAt, projection.updatedAt));
  }
  if (legacy.version !== projection.version) {
    differences.push(
      createFieldDifference('version', legacy.version, projection.version, 'VERSION_MISMATCH')
    );
  }

  differences.push(...compareLineItems(legacy.lineItems, projection.lineItems));
  return differences;
}

function resolveOutcome(differences: readonly OrderParityDifference[]): OrderParityOutcome {
  if (differences.length === 0) return 'MATCH';
  if (differences.some((d) => d.category === 'VERSION_MISMATCH')) return 'VERSION_MISMATCH';
  return 'FIELD_MISMATCH';
}

export function compareOrderCanonicalModels(
  orderId: string,
  legacy: OrderCanonicalModel | null,
  projection: OrderCanonicalModel | null,
  comparedAt: string
): OrderParityResult {
  if (legacy === null && projection === null) {
    return {
      orderId,
      outcome: 'UNSUPPORTED_EVENT',
      differences: [createFieldDifference('order', null, null, 'UNSUPPORTED_EVENT')],
      comparedAt,
    };
  }

  if (legacy === null) {
    return {
      orderId,
      outcome: 'MISSING_IN_LEGACY',
      differences: [createFieldDifference('legacy', null, projection, 'MISSING_IN_LEGACY')],
      comparedAt,
      projectionVersion: projection?.version,
    };
  }

  if (projection === null) {
    return {
      orderId,
      outcome: 'MISSING_IN_PROJECTION',
      differences: [createFieldDifference('projection', legacy, null, 'MISSING_IN_PROJECTION')],
      comparedAt,
      legacyVersion: legacy.version,
    };
  }

  const differences = compareCanonicalFields(legacy, projection);
  return {
    orderId,
    outcome: resolveOutcome(differences),
    differences,
    comparedAt,
    legacyVersion: legacy.version,
    projectionVersion: projection.version,
  };
}

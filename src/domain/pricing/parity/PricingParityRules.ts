/**
 * Pricing parity comparison rules (M8 PR-8).
 * Pure domain — no infrastructure imports.
 */

import type { PricingCanonicalModel } from './PricingCanonicalModel';
import { createPricingFieldDifference } from './PricingParityDifference';
import type { PricingParityDifference } from './PricingParityDifference';
import type { PricingParityOutcome, PricingParityResult } from './PricingParityResult';

export const COMPARABLE_PRICING_PARITY_FIELDS = [
  'priceListId',
  'tenantId',
  'branchId',
  'pricingVersion',
  'status',
  'priceCount',
  'couponCount',
  'campaignCount',
  'offerCount',
  'updatedAt',
] as const;

export type ComparablePricingParityField = (typeof COMPARABLE_PRICING_PARITY_FIELDS)[number];

export const IGNORED_PRICING_PARITY_METADATA_FIELDS = [
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
  'price',
  'prices',
  'gst',
  'discount',
  'couponPayload',
  'campaignPayload',
  'offerPayload',
] as const;

function compareOptionalString(legacy?: string, projection?: string): boolean {
  return (legacy ?? undefined) === (projection ?? undefined);
}

function compareCanonicalFields(
  legacy: PricingCanonicalModel,
  projection: PricingCanonicalModel
): PricingParityDifference[] {
  const differences: PricingParityDifference[] = [];

  if (legacy.priceListId !== projection.priceListId) {
    differences.push(
      createPricingFieldDifference('priceListId', legacy.priceListId, projection.priceListId)
    );
  }
  if (legacy.tenantId !== projection.tenantId) {
    differences.push(
      createPricingFieldDifference('tenantId', legacy.tenantId, projection.tenantId)
    );
  }
  if (!compareOptionalString(legacy.branchId, projection.branchId)) {
    differences.push(
      createPricingFieldDifference('branchId', legacy.branchId, projection.branchId)
    );
  }
  if (legacy.pricingVersion !== projection.pricingVersion) {
    differences.push(
      createPricingFieldDifference(
        'pricingVersion',
        legacy.pricingVersion,
        projection.pricingVersion,
        'VERSION_MISMATCH'
      )
    );
  }
  if (legacy.status !== projection.status) {
    differences.push(createPricingFieldDifference('status', legacy.status, projection.status));
  }
  if (legacy.priceCount !== projection.priceCount) {
    differences.push(
      createPricingFieldDifference('priceCount', legacy.priceCount, projection.priceCount)
    );
  }
  if (legacy.couponCount !== projection.couponCount) {
    differences.push(
      createPricingFieldDifference('couponCount', legacy.couponCount, projection.couponCount)
    );
  }
  if (legacy.campaignCount !== projection.campaignCount) {
    differences.push(
      createPricingFieldDifference(
        'campaignCount',
        legacy.campaignCount,
        projection.campaignCount
      )
    );
  }
  if (legacy.offerCount !== projection.offerCount) {
    differences.push(
      createPricingFieldDifference('offerCount', legacy.offerCount, projection.offerCount)
    );
  }
  if (legacy.updatedAt !== projection.updatedAt) {
    differences.push(
      createPricingFieldDifference('updatedAt', legacy.updatedAt, projection.updatedAt)
    );
  }

  return differences;
}

function resolveOutcome(differences: readonly PricingParityDifference[]): PricingParityOutcome {
  if (differences.length === 0) return 'MATCH';
  if (differences.some((difference) => difference.category === 'VERSION_MISMATCH')) {
    return 'VERSION_MISMATCH';
  }
  return 'FIELD_MISMATCH';
}

export function comparePricingCanonicalModels(
  priceListId: string,
  legacy: PricingCanonicalModel | null,
  projection: PricingCanonicalModel | null,
  comparedAt: string
): PricingParityResult {
  if (legacy === null && projection === null) {
    return {
      priceListId,
      outcome: 'UNSUPPORTED',
      differences: [createPricingFieldDifference('priceList', null, null, 'UNSUPPORTED')],
      comparedAt,
    };
  }

  if (legacy === null) {
    return {
      priceListId,
      outcome: 'MISSING_IN_LEGACY',
      differences: [createPricingFieldDifference('legacy', null, projection, 'MISSING_IN_LEGACY')],
      comparedAt,
      projectionVersion: projection?.pricingVersion,
    };
  }

  if (projection === null) {
    return {
      priceListId,
      outcome: 'MISSING_IN_PROJECTION',
      differences: [
        createPricingFieldDifference('projection', legacy, null, 'MISSING_IN_PROJECTION'),
      ],
      comparedAt,
      legacyVersion: legacy.pricingVersion,
    };
  }

  const differences = compareCanonicalFields(legacy, projection);
  return {
    priceListId,
    outcome: resolveOutcome(differences),
    differences,
    comparedAt,
    legacyVersion: legacy.pricingVersion,
    projectionVersion: projection.pricingVersion,
  };
}

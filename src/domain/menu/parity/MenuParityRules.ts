/**
 * Menu parity comparison rules (M7 PR-8).
 * Pure domain — no infrastructure imports.
 */

import type { MenuCanonicalModel } from './MenuCanonicalModel';
import { createMenuFieldDifference } from './MenuParityDifference';
import type { MenuParityDifference } from './MenuParityDifference';
import type { MenuParityOutcome, MenuParityResult } from './MenuParityResult';

export const COMPARABLE_MENU_PARITY_FIELDS = [
  'catalogId',
  'tenantId',
  'branchId',
  'catalogVersion',
  'status',
  'categoryCount',
  'itemCount',
  'modifierGroupCount',
  'comboCount',
  'updatedAt',
] as const;

export type ComparableMenuParityField = (typeof COMPARABLE_MENU_PARITY_FIELDS)[number];

export const IGNORED_MENU_PARITY_METADATA_FIELDS = [
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

function compareOptionalString(legacy?: string, projection?: string): boolean {
  return (legacy ?? undefined) === (projection ?? undefined);
}

function compareCanonicalFields(
  legacy: MenuCanonicalModel,
  projection: MenuCanonicalModel
): MenuParityDifference[] {
  const differences: MenuParityDifference[] = [];

  if (legacy.catalogId !== projection.catalogId) {
    differences.push(createMenuFieldDifference('catalogId', legacy.catalogId, projection.catalogId));
  }
  if (legacy.tenantId !== projection.tenantId) {
    differences.push(createMenuFieldDifference('tenantId', legacy.tenantId, projection.tenantId));
  }
  if (!compareOptionalString(legacy.branchId, projection.branchId)) {
    differences.push(createMenuFieldDifference('branchId', legacy.branchId, projection.branchId));
  }
  if (legacy.catalogVersion !== projection.catalogVersion) {
    differences.push(
      createMenuFieldDifference(
        'catalogVersion',
        legacy.catalogVersion,
        projection.catalogVersion,
        'VERSION_MISMATCH'
      )
    );
  }
  if (legacy.status !== projection.status) {
    differences.push(createMenuFieldDifference('status', legacy.status, projection.status));
  }
  if (legacy.categoryCount !== projection.categoryCount) {
    differences.push(
      createMenuFieldDifference('categoryCount', legacy.categoryCount, projection.categoryCount)
    );
  }
  if (legacy.itemCount !== projection.itemCount) {
    differences.push(createMenuFieldDifference('itemCount', legacy.itemCount, projection.itemCount));
  }
  if (legacy.modifierGroupCount !== projection.modifierGroupCount) {
    differences.push(
      createMenuFieldDifference(
        'modifierGroupCount',
        legacy.modifierGroupCount,
        projection.modifierGroupCount
      )
    );
  }
  if (legacy.comboCount !== projection.comboCount) {
    differences.push(createMenuFieldDifference('comboCount', legacy.comboCount, projection.comboCount));
  }
  if (legacy.updatedAt !== projection.updatedAt) {
    differences.push(createMenuFieldDifference('updatedAt', legacy.updatedAt, projection.updatedAt));
  }

  return differences;
}

function resolveOutcome(differences: readonly MenuParityDifference[]): MenuParityOutcome {
  if (differences.length === 0) return 'MATCH';
  if (differences.some((difference) => difference.category === 'VERSION_MISMATCH')) {
    return 'VERSION_MISMATCH';
  }
  return 'FIELD_MISMATCH';
}

export function compareMenuCanonicalModels(
  catalogId: string,
  legacy: MenuCanonicalModel | null,
  projection: MenuCanonicalModel | null,
  comparedAt: string
): MenuParityResult {
  if (legacy === null && projection === null) {
    return {
      catalogId,
      outcome: 'UNSUPPORTED',
      differences: [createMenuFieldDifference('catalog', null, null, 'UNSUPPORTED')],
      comparedAt,
    };
  }

  if (legacy === null) {
    return {
      catalogId,
      outcome: 'MISSING_IN_LEGACY',
      differences: [createMenuFieldDifference('legacy', null, projection, 'MISSING_IN_LEGACY')],
      comparedAt,
      projectionVersion: projection?.catalogVersion,
    };
  }

  if (projection === null) {
    return {
      catalogId,
      outcome: 'MISSING_IN_PROJECTION',
      differences: [createMenuFieldDifference('projection', legacy, null, 'MISSING_IN_PROJECTION')],
      comparedAt,
      legacyVersion: legacy.catalogVersion,
    };
  }

  const differences = compareCanonicalFields(legacy, projection);
  return {
    catalogId,
    outcome: resolveOutcome(differences),
    differences,
    comparedAt,
    legacyVersion: legacy.catalogVersion,
    projectionVersion: projection.catalogVersion,
  };
}

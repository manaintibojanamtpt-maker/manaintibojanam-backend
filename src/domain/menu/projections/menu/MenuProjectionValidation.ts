/**
 * Menu catalog shadow projection validation (M7 PR-7).
 * Pure domain — no infrastructure imports.
 */

import type { MenuCatalogProjectionReadModel } from './MenuProjectionState';
import { isSupportedMenuCatalogProjectionEvent } from './MenuProjectionMetadata';

const FORBIDDEN_PAYLOAD_FIELDS = [
  'price',
  'prices',
  'inventory',
  'searchIndex',
  'branchOverrides',
  'items',
  'categories',
  'modifiers',
  'combos',
] as const;

export function validateMenuCatalogProjectionReadModel(
  model: MenuCatalogProjectionReadModel
): readonly string[] {
  const errors: string[] = [];
  if (!model.catalogId) errors.push('catalogId is required');
  if (!model.tenantId) errors.push('tenantId is required');
  if (!model.catalogVersion) errors.push('catalogVersion is required');
  if (!model.status) errors.push('status is required');
  if (!model.updatedAt) errors.push('updatedAt is required');
  if (!model.projectionVersion) errors.push('projectionVersion is required');
  if (model.categoryCount < 0) errors.push('categoryCount must be >= 0');
  if (model.itemCount < 0) errors.push('itemCount must be >= 0');
  if (model.modifierGroupCount < 0) errors.push('modifierGroupCount must be >= 0');
  if (model.comboCount < 0) errors.push('comboCount must be >= 0');
  return errors;
}

export function validateMenuCatalogProjectionEventType(eventType: string): readonly string[] {
  if (!isSupportedMenuCatalogProjectionEvent(eventType)) {
    return [`Unsupported menu catalog projection event: ${eventType}`];
  }
  return [];
}

export function assertNoForbiddenPayloadFieldsInReadModel(
  record: Record<string, unknown>
): readonly string[] {
  const errors: string[] = [];
  for (const field of FORBIDDEN_PAYLOAD_FIELDS) {
    if (field in record && record[field] !== undefined) {
      errors.push(`Forbidden read model field: ${field}`);
    }
  }
  return errors;
}

export function canApplyCatalogUpdate(existing: MenuCatalogProjectionReadModel | null): boolean {
  return existing !== null;
}

export function canApplyCatalogDelete(existing: MenuCatalogProjectionReadModel | null): boolean {
  return existing !== null;
}

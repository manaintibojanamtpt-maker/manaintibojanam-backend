/**
 * Menu catalog shadow projection builders (M7 PR-7).
 * Pure domain — no infrastructure imports.
 */

import {
  MENU_CATALOG_EVENT_TYPES,
  MENU_CATALOG_READ_PROJECTION_VERSION,
  type MenuCatalogCreatedPayload,
  type MenuCatalogDeletedPayload,
  type MenuCatalogUpdatedPayload,
} from './MenuProjectionMetadata';
import type { MenuCatalogProjectionReadModel } from './MenuProjectionState';

export interface MenuCatalogProjectionEventContext {
  readonly eventId: string;
  readonly eventType: string;
  readonly schemaVersion: string;
  readonly occurredAt: string;
  readonly branchId?: string;
}

export function buildMenuCatalogProjectionFromCreated(
  payload: MenuCatalogCreatedPayload,
  context: MenuCatalogProjectionEventContext
): MenuCatalogProjectionReadModel {
  return {
    catalogId: payload.catalogId,
    tenantId: payload.tenantId,
    branchId: context.branchId,
    catalogVersion: payload.catalogVersion,
    status: payload.status,
    categoryCount: payload.categoryCount,
    itemCount: payload.itemCount,
    modifierGroupCount: payload.modifierGroupCount,
    comboCount: payload.comboCount,
    updatedAt: context.occurredAt,
    projectionVersion: MENU_CATALOG_READ_PROJECTION_VERSION,
  };
}

export function applyMenuCatalogProjectionUpdated(
  current: MenuCatalogProjectionReadModel,
  payload: MenuCatalogUpdatedPayload,
  context: MenuCatalogProjectionEventContext
): MenuCatalogProjectionReadModel {
  return {
    ...current,
    branchId: context.branchId ?? current.branchId,
    catalogVersion: payload.catalogVersion,
    status: payload.status ?? current.status,
    categoryCount: payload.categoryCount ?? current.categoryCount,
    itemCount: payload.itemCount ?? current.itemCount,
    modifierGroupCount: payload.modifierGroupCount ?? current.modifierGroupCount,
    comboCount: payload.comboCount ?? current.comboCount,
    updatedAt: context.occurredAt,
    projectionVersion: MENU_CATALOG_READ_PROJECTION_VERSION,
  };
}

export function applyMenuCatalogProjectionDeleted(
  current: MenuCatalogProjectionReadModel,
  payload: MenuCatalogDeletedPayload,
  context: MenuCatalogProjectionEventContext
): MenuCatalogProjectionReadModel {
  return {
    ...current,
    branchId: context.branchId ?? current.branchId,
    catalogVersion: payload.catalogVersion ?? current.catalogVersion,
    status: payload.status,
    updatedAt: context.occurredAt,
    projectionVersion: MENU_CATALOG_READ_PROJECTION_VERSION,
  };
}

export function resolveMenuCatalogProjectionTransition(
  eventType: string
): 'create' | 'update' | 'delete' | 'unsupported' {
  switch (eventType) {
    case MENU_CATALOG_EVENT_TYPES.CREATED:
      return 'create';
    case MENU_CATALOG_EVENT_TYPES.UPDATED:
      return 'update';
    case MENU_CATALOG_EVENT_TYPES.DELETED:
      return 'delete';
    default:
      return 'unsupported';
  }
}

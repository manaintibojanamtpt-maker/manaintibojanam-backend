/**
 * Menu catalog shadow projection metadata (M7 PR-7).
 * Pure domain — no infrastructure imports.
 */

export const MENU_CATALOG_PROJECTION_DOMAIN_VERSION = '0.1.0-menu-catalog-projection' as const;

export const MENU_CATALOG_READ_PROJECTION_NAME = 'menu-catalog-read-shadow' as const;
export const MENU_CATALOG_READ_PROJECTION_VERSION = '1.0.0' as const;
export const MENU_CATALOG_READ_PROJECTION_CONSUMER_GROUP = 'menu-catalog-read-shadow' as const;
export const MENU_CATALOG_READ_PROJECTION_OWNER = 'M7-CatalogKernel' as const;

export const MENU_CATALOG_EVENT_TYPES = {
  CREATED: 'menu.catalog.created.v1',
  UPDATED: 'menu.catalog.updated.v1',
  DELETED: 'menu.catalog.deleted.v1',
} as const;

export const SUPPORTED_MENU_CATALOG_PROJECTION_EVENTS = [
  MENU_CATALOG_EVENT_TYPES.CREATED,
  MENU_CATALOG_EVENT_TYPES.UPDATED,
  MENU_CATALOG_EVENT_TYPES.DELETED,
] as const;

export type SupportedMenuCatalogProjectionEvent =
  (typeof SUPPORTED_MENU_CATALOG_PROJECTION_EVENTS)[number];

export function isSupportedMenuCatalogProjectionEvent(
  eventType: string
): eventType is SupportedMenuCatalogProjectionEvent {
  return (SUPPORTED_MENU_CATALOG_PROJECTION_EVENTS as readonly string[]).includes(eventType);
}

/**
 * Canonical future event payload schemas — definitions only. No publishers.
 */
export interface MenuCatalogCreatedPayload {
  readonly catalogId: string;
  readonly tenantId: string;
  readonly catalogVersion: string;
  readonly status: string;
  readonly categoryCount: number;
  readonly itemCount: number;
  readonly modifierGroupCount: number;
  readonly comboCount: number;
}

export interface MenuCatalogUpdatedPayload {
  readonly catalogId: string;
  readonly tenantId: string;
  readonly catalogVersion: string;
  readonly status?: string;
  readonly categoryCount?: number;
  readonly itemCount?: number;
  readonly modifierGroupCount?: number;
  readonly comboCount?: number;
}

export interface MenuCatalogDeletedPayload {
  readonly catalogId: string;
  readonly tenantId: string;
  readonly catalogVersion?: string;
  readonly status: string;
}

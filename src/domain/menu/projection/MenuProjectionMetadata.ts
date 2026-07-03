/**
 * Menu projection — metadata constants (M7 PR-6).
 * Pure domain — no infrastructure imports.
 */

export const MENU_PROJECTION_DOMAIN_VERSION = '0.1.0-foundation' as const;
export const MENU_PROJECTION_SCHEMA_VERSION = '0.1.0' as const;
export const MENU_PROJECTION_MODULE = 'menu-projection' as const;

export const MENU_PROJECTION_FOUNDATION_NAME = 'menu-projection-foundation' as const;
export const MENU_PROJECTION_FOUNDATION_VERSION = '0.1.0-foundation' as const;
export const MENU_PROJECTION_FOUNDATION_CONSUMER_GROUP = 'menu-projection-foundation' as const;

export interface MenuProjectionIdentity {
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly consumerGroup: string;
  readonly schemaVersion: string;
}

export const MENU_PROJECTION_FOUNDATION_IDENTITY: MenuProjectionIdentity = {
  projectionName: MENU_PROJECTION_FOUNDATION_NAME,
  projectionVersion: MENU_PROJECTION_FOUNDATION_VERSION,
  consumerGroup: MENU_PROJECTION_FOUNDATION_CONSUMER_GROUP,
  schemaVersion: MENU_PROJECTION_SCHEMA_VERSION,
};

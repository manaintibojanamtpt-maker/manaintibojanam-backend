/**
 * Menu catalog shadow projection state (M7 PR-7).
 * Catalog-centric aggregate root — metadata and counts only.
 * Pure domain — no infrastructure imports.
 */

export interface MenuCatalogProjectionReadModel {
  readonly catalogId: string;
  readonly tenantId: string;
  readonly branchId?: string;
  readonly catalogVersion: string;
  readonly status: string;
  readonly categoryCount: number;
  readonly itemCount: number;
  readonly modifierGroupCount: number;
  readonly comboCount: number;
  readonly updatedAt: string;
  readonly projectionVersion: string;
}

export interface MenuCatalogProjectionSnapshotRecord {
  readonly snapshotId: string;
  readonly catalogId: string;
  readonly tenantId: string;
  readonly projectionVersion: string;
  readonly readModel: MenuCatalogProjectionReadModel;
  readonly capturedAt: string;
  readonly lastEventId: string;
  readonly lastEventType: string;
}

export type MenuCatalogProjectionState = MenuCatalogProjectionReadModel;

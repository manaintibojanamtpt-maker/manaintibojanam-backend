/**
 * Pricing catalog shadow projection state (M8 PR-7).
 * Metadata and counts only — no price values or payloads.
 */

export interface PricingCatalogProjectionReadModel {
  readonly priceListId: string;
  readonly tenantId: string;
  readonly branchId?: string;
  readonly pricingVersion: string;
  readonly status: string;
  readonly priceCount: number;
  readonly couponCount: number;
  readonly campaignCount: number;
  readonly offerCount: number;
  readonly updatedAt: string;
  readonly projectionVersion: string;
}

/** Snapshot metadata only — no embedded catalog payloads. */
export interface PricingCatalogProjectionSnapshotRecord {
  readonly snapshotId: string;
  readonly priceListId: string;
  readonly tenantId: string;
  readonly projectionVersion: string;
  readonly pricingVersion: string;
  readonly status: string;
  readonly priceCount: number;
  readonly couponCount: number;
  readonly campaignCount: number;
  readonly offerCount: number;
  readonly capturedAt: string;
  readonly lastEventId: string;
  readonly lastEventType: string;
}

export type PricingCatalogProjectionState = PricingCatalogProjectionReadModel;

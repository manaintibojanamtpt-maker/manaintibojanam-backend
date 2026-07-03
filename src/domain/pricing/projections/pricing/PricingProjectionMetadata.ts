/**
 * Pricing catalog shadow projection metadata (M8 PR-7).
 * Pure domain — no infrastructure imports.
 */

export const PRICING_CATALOG_PROJECTION_DOMAIN_VERSION = '0.1.0-pricing-catalog-projection' as const;

export const PRICING_CATALOG_READ_PROJECTION_NAME = 'pricing-catalog-read-shadow' as const;
export const PRICING_CATALOG_READ_PROJECTION_VERSION = '1.0.0' as const;
export const PRICING_CATALOG_READ_PROJECTION_CONSUMER_GROUP = 'pricing-catalog-read-shadow' as const;
export const PRICING_CATALOG_READ_PROJECTION_OWNER = 'M8-PricingKernel' as const;

export const PRICING_CATALOG_EVENT_TYPES = {
  CREATED: 'pricing.catalog.created.v1',
  UPDATED: 'pricing.catalog.updated.v1',
  DELETED: 'pricing.catalog.deleted.v1',
} as const;

export const SUPPORTED_PRICING_CATALOG_PROJECTION_EVENTS = [
  PRICING_CATALOG_EVENT_TYPES.CREATED,
  PRICING_CATALOG_EVENT_TYPES.UPDATED,
  PRICING_CATALOG_EVENT_TYPES.DELETED,
] as const;

export type SupportedPricingCatalogProjectionEvent =
  (typeof SUPPORTED_PRICING_CATALOG_PROJECTION_EVENTS)[number];

export function isSupportedPricingCatalogProjectionEvent(
  eventType: string
): eventType is SupportedPricingCatalogProjectionEvent {
  return (SUPPORTED_PRICING_CATALOG_PROJECTION_EVENTS as readonly string[]).includes(eventType);
}

/** Mock envelope payload schemas — definitions only. No publishers. */
export interface PricingCatalogCreatedPayload {
  readonly priceListId: string;
  readonly tenantId: string;
  readonly pricingVersion: string;
  readonly status: string;
  readonly priceCount: number;
  readonly couponCount: number;
  readonly campaignCount: number;
  readonly offerCount: number;
}

export interface PricingCatalogUpdatedPayload {
  readonly priceListId: string;
  readonly tenantId: string;
  readonly pricingVersion: string;
  readonly status?: string;
  readonly priceCount?: number;
  readonly couponCount?: number;
  readonly campaignCount?: number;
  readonly offerCount?: number;
}

export interface PricingCatalogDeletedPayload {
  readonly priceListId: string;
  readonly tenantId: string;
  readonly pricingVersion?: string;
  readonly status: string;
}

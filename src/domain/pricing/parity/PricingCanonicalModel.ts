/**
 * Pricing canonical parity model (M8 PR-8).
 * Pure domain — no infrastructure imports.
 */

export const PRICING_CANONICAL_VERSION = '1.0.0' as const;

export type LegacyPricingTimestamp =
  | string
  | number
  | { readonly toDate?: () => Date; readonly _seconds?: number; readonly seconds?: number };

/**
 * Legacy pricing repository document shape (validation-only; not wired to Firestore).
 */
export interface LegacyPricingCatalogDocument {
  readonly priceListId: string;
  readonly tenantId: string;
  readonly branchId?: string;
  readonly pricingVersion: string;
  readonly status: string;
  readonly priceCount: number;
  readonly couponCount: number;
  readonly campaignCount: number;
  readonly offerCount: number;
  readonly updatedAt: LegacyPricingTimestamp;
  readonly projectionVersion?: string;
  readonly snapshotId?: string;
  readonly checkpoint?: string;
}

export interface PricingCanonicalModel {
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
}

export function resolvePricingParityTimestamp(
  value: LegacyPricingTimestamp | undefined,
  fallback: string
): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    const seconds = value._seconds ?? value.seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000).toISOString();
    }
  }
  return fallback;
}

export function normalizePricingParityStatus(status: string | undefined | null): string {
  if (!status) return 'UNKNOWN';
  return String(status).trim().toUpperCase().replace(/\s+/g, '_');
}

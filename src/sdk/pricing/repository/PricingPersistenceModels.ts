/**
 * PricingSDK — persistence record models (M8 PR-3).
 * Pure persistence shapes — no Firestore types, no domain imports.
 */

export interface MoneyRecord {
  readonly amount: number;
  readonly currency: string;
}

export interface PriceRecord {
  readonly itemId: string;
  readonly tenantId: string;
  readonly baseAmount: MoneyRecord;
  readonly effectiveAmount: MoneyRecord;
  readonly priceListId?: string;
  readonly priceListVersion?: string;
  readonly branchId?: string;
  readonly active: boolean;
}

export interface TaxRecord {
  readonly taxId: string;
  readonly tenantId: string;
  readonly code: string;
  readonly label: string;
  readonly ratePercent: number;
  readonly regionCode?: string;
  readonly active: boolean;
}

export interface GSTRecord {
  readonly gstId: string;
  readonly tenantId: string;
  readonly categoryCode: string;
  readonly cgstPercent: number;
  readonly sgstPercent: number;
  readonly igstPercent: number;
  readonly cessPercent?: number;
  readonly active: boolean;
}

export interface DiscountRecord {
  readonly discountId: string;
  readonly tenantId: string;
  readonly type: 'percentage' | 'fixed';
  readonly value: number;
  readonly applicationMode: 'manual' | 'automatic';
  readonly active: boolean;
  readonly label?: string;
}

export interface CouponRecord {
  readonly couponCode: string;
  readonly tenantId: string;
  readonly discount: DiscountRecord;
  readonly expiresAt?: string;
  readonly maxUses?: number;
  readonly usedCount?: number;
  readonly enabled: boolean;
  readonly active: boolean;
}

export interface CampaignRecord {
  readonly campaignId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly enabled: boolean;
  readonly active: boolean;
}

export interface OfferRecord {
  readonly offerId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly kind: 'percentage' | 'fixed' | 'buy_x_get_y';
  readonly value: number;
  readonly priority: 'low' | 'normal' | 'high';
  readonly buyQuantity?: number;
  readonly getQuantity?: number;
  readonly active: boolean;
}

export interface PriceListEntryRecord {
  readonly itemId: string;
  readonly baseAmount: MoneyRecord;
  readonly sortOrder: number;
  readonly active: boolean;
}

export interface BranchPriceOverrideRecord {
  readonly branchId: string;
  readonly itemId: string;
  readonly overrideAmount: MoneyRecord;
  readonly active: boolean;
}

export interface PriceListRecord {
  readonly priceListId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly version: string;
  readonly prices: readonly PriceListEntryRecord[];
  readonly branchOverrides?: readonly BranchPriceOverrideRecord[];
  readonly active: boolean;
}

export interface DeliveryChargeRecord {
  readonly chargeId: string;
  readonly tenantId: string;
  readonly zoneId: string;
  readonly flatAmount: MoneyRecord;
  readonly minOrderAmount?: MoneyRecord;
  readonly active: boolean;
}

export interface PackagingChargeRecord {
  readonly chargeId: string;
  readonly tenantId: string;
  readonly label: string;
  readonly flatAmount: MoneyRecord;
  readonly perItemAmount?: MoneyRecord;
  readonly active: boolean;
}

export interface PricingSearchRecordHit {
  readonly kind: 'price' | 'coupon' | 'campaign' | 'offer';
  readonly recordId: string;
  readonly score: number;
  readonly matchedFields: readonly string[];
  readonly price?: PriceRecord;
  readonly coupon?: CouponRecord;
  readonly campaign?: CampaignRecord;
  readonly offer?: OfferRecord;
}

export interface PricingSearchRecordResult {
  readonly hits: readonly PricingSearchRecordHit[];
  readonly totalHits: number;
  readonly queryText: string;
}

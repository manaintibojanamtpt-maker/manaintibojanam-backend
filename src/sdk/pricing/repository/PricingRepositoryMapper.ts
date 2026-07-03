/**
 * PricingSDK — persistence to DTO mapping (M8 PR-3).
 * Mapping only — no business validation or pricing calculations.
 */

import type { Money, PriceResult } from '../dto';
import type { BranchId, MenuItemId, PriceListId, TenantId } from '../types/branded';
import type { SdkError, SdkErrorCode } from '../../core/errors';
import type { SdkFailure } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';
import { PRICING_ERROR_MESSAGES } from '../errors/pricingErrors';
import type {
  BranchPriceOverrideRecord,
  CampaignRecord,
  CouponRecord,
  DeliveryChargeRecord,
  DiscountRecord,
  GSTRecord,
  MoneyRecord,
  OfferRecord,
  PackagingChargeRecord,
  PriceListEntryRecord,
  PriceListRecord,
  PriceRecord,
  PricingSearchRecordHit,
  PricingSearchRecordResult,
  TaxRecord,
} from './PricingPersistenceModels';

const PERSISTENCE_ERROR_CODES: readonly SdkErrorCode[] = [
  'NOT_FOUND',
  'UNAVAILABLE',
  'NOT_CONFIGURED',
  'VALIDATION',
];

export const mapPersistenceError = (error: SdkError): SdkFailure => {
  if (PERSISTENCE_ERROR_CODES.includes(error.code)) {
    return sdkFail(error);
  }
  return sdkFail(
    sdkError('UNAVAILABLE', error.message || PRICING_ERROR_MESSAGES.NOT_CONFIGURED, {
      pricingCode: error.code,
      ...error.details,
    })
  );
};

export const mapMoneyRecord = (record: MoneyRecord): Money => ({
  amount: record.amount,
  currency: record.currency,
});

export const mapPriceRecordToPriceResult = (
  record: PriceRecord,
  quantity = 1
): PriceResult => {
  const unitPrice = mapMoneyRecord(record.effectiveAmount);
  return {
    unitPrice,
    totalPrice: {
      amount: unitPrice.amount * quantity,
      currency: unitPrice.currency,
    },
    priceListVersion: record.priceListVersion,
  };
};

export interface MappedPriceList {
  readonly priceListId: PriceListId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly version: string;
  readonly active: boolean;
  readonly prices: ReadonlyArray<{
    readonly itemId: MenuItemId;
    readonly unitPrice: Money;
    readonly sortOrder: number;
    readonly active: boolean;
  }>;
}

export interface MappedBranchPricing {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly overrides: ReadonlyArray<{
    readonly itemId: MenuItemId;
    readonly overrideAmount: Money;
    readonly active: boolean;
  }>;
}

export interface MappedCoupon {
  readonly couponCode: string;
  readonly tenantId: TenantId;
  readonly discount: MappedDiscount;
  readonly expiresAt?: string;
  readonly enabled: boolean;
  readonly active: boolean;
}

export interface MappedDiscount {
  readonly discountId: string;
  readonly type: DiscountRecord['type'];
  readonly value: number;
  readonly applicationMode: DiscountRecord['applicationMode'];
  readonly active: boolean;
  readonly label?: string;
}

export interface MappedCampaign {
  readonly campaignId: string;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly enabled: boolean;
  readonly active: boolean;
}

export interface MappedOffer {
  readonly offerId: string;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly kind: OfferRecord['kind'];
  readonly value: number;
  readonly priority: OfferRecord['priority'];
  readonly active: boolean;
}

export interface MappedPricingSearchResult {
  readonly hits: ReadonlyArray<{
    readonly kind: PricingSearchRecordHit['kind'];
    readonly recordId: string;
    readonly score: number;
    readonly matchedFields: readonly string[];
    readonly price?: PriceResult;
    readonly coupon?: MappedCoupon;
    readonly campaign?: MappedCampaign;
    readonly offer?: MappedOffer;
  }>;
  readonly totalHits: number;
  readonly queryText: string;
}

export const mapDiscountRecord = (record: DiscountRecord): MappedDiscount => ({
  discountId: record.discountId,
  type: record.type,
  value: record.value,
  applicationMode: record.applicationMode,
  active: record.active,
  label: record.label,
});

export const mapCouponRecord = (record: CouponRecord): MappedCoupon => ({
  couponCode: record.couponCode,
  tenantId: record.tenantId as TenantId,
  discount: mapDiscountRecord(record.discount),
  expiresAt: record.expiresAt,
  enabled: record.enabled,
  active: record.active,
});

export const mapCampaignRecord = (record: CampaignRecord): MappedCampaign => ({
  campaignId: record.campaignId,
  tenantId: record.tenantId as TenantId,
  name: record.name,
  startsAt: record.startsAt,
  endsAt: record.endsAt,
  enabled: record.enabled,
  active: record.active,
});

export const mapOfferRecord = (record: OfferRecord): MappedOffer => ({
  offerId: record.offerId,
  tenantId: record.tenantId as TenantId,
  name: record.name,
  kind: record.kind,
  value: record.value,
  priority: record.priority,
  active: record.active,
});

export const mapTaxRecord = (record: TaxRecord) => ({
  taxId: record.taxId,
  tenantId: record.tenantId as TenantId,
  code: record.code,
  label: record.label,
  ratePercent: record.ratePercent,
  regionCode: record.regionCode,
  active: record.active,
});

export const mapGstRecord = (record: GSTRecord) => ({
  gstId: record.gstId,
  tenantId: record.tenantId as TenantId,
  categoryCode: record.categoryCode,
  cgstPercent: record.cgstPercent,
  sgstPercent: record.sgstPercent,
  igstPercent: record.igstPercent,
  cessPercent: record.cessPercent,
  active: record.active,
});

export const mapDeliveryChargeRecord = (record: DeliveryChargeRecord) => ({
  chargeId: record.chargeId,
  tenantId: record.tenantId as TenantId,
  zoneId: record.zoneId,
  flatAmount: mapMoneyRecord(record.flatAmount),
  minOrderAmount: record.minOrderAmount ? mapMoneyRecord(record.minOrderAmount) : undefined,
  active: record.active,
});

export const mapPackagingChargeRecord = (record: PackagingChargeRecord) => ({
  chargeId: record.chargeId,
  tenantId: record.tenantId as TenantId,
  label: record.label,
  flatAmount: mapMoneyRecord(record.flatAmount),
  perItemAmount: record.perItemAmount ? mapMoneyRecord(record.perItemAmount) : undefined,
  active: record.active,
});

export const sortPriceListEntryRecords = (
  records: readonly PriceListEntryRecord[]
): readonly PriceListEntryRecord[] =>
  [...records].sort((left, right) => left.sortOrder - right.sortOrder);

export const filterActivePriceListEntryRecords = (
  records: readonly PriceListEntryRecord[],
  includeInactive = false
): readonly PriceListEntryRecord[] =>
  includeInactive ? records : records.filter((record) => record.active);

export const filterActiveBranchOverrideRecords = (
  records: readonly BranchPriceOverrideRecord[],
  branchId?: string,
  includeInactive = false
): readonly BranchPriceOverrideRecord[] => {
  let filtered = records;
  if (branchId) {
    filtered = filtered.filter((record) => record.branchId === branchId);
  }
  return includeInactive ? filtered : filtered.filter((record) => record.active);
};

export const mapPriceListRecord = (
  record: PriceListRecord,
  includeInactive = false
): MappedPriceList => {
  const prices = sortPriceListEntryRecords(
    filterActivePriceListEntryRecords(record.prices, includeInactive)
  );

  return {
    priceListId: record.priceListId as PriceListId,
    tenantId: record.tenantId as TenantId,
    name: record.name,
    version: record.version,
    active: record.active,
    prices: prices.map((entry) => ({
      itemId: entry.itemId as MenuItemId,
      unitPrice: mapMoneyRecord(entry.baseAmount),
      sortOrder: entry.sortOrder,
      active: entry.active,
    })),
  };
};

export const mapBranchPricingFromPriceList = (
  record: PriceListRecord,
  branchId: BranchId,
  includeInactive = false
): MappedBranchPricing => ({
  tenantId: record.tenantId as TenantId,
  branchId,
  overrides: filterActiveBranchOverrideRecords(
    record.branchOverrides ?? [],
    String(branchId),
    includeInactive
  ).map((override) => ({
    itemId: override.itemId as MenuItemId,
    overrideAmount: mapMoneyRecord(override.overrideAmount),
    active: override.active,
  })),
});

export const mapPricingSearchRecordResult = (
  result: PricingSearchRecordResult
): MappedPricingSearchResult => ({
  hits: result.hits.map((hit) => ({
    kind: hit.kind,
    recordId: hit.recordId,
    score: hit.score,
    matchedFields: [...hit.matchedFields],
    price: hit.price ? mapPriceRecordToPriceResult(hit.price) : undefined,
    coupon: hit.coupon ? mapCouponRecord(hit.coupon) : undefined,
    campaign: hit.campaign ? mapCampaignRecord(hit.campaign) : undefined,
    offer: hit.offer ? mapOfferRecord(hit.offer) : undefined,
  })),
  totalHits: result.totalHits,
  queryText: result.queryText,
});

export const normalizeTenantId = (tenantId: TenantId): string => String(tenantId);

export const normalizeBranchId = (branchId?: BranchId): string | undefined =>
  branchId ? String(branchId) : undefined;

export const normalizePriceListId = (priceListId: PriceListId): string => String(priceListId);

export const normalizeItemId = (itemId: MenuItemId): string => String(itemId);

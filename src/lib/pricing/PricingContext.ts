/**
 * M8 PR-5 — Pricing presentation context and types.
 */

import type { TenantId } from '../../sdk/core/types';
import type {
  ApplyCouponQuery,
  CalculateDeliveryFeeQuery,
  CalculatePackagingFeeQuery,
  CalculatePriceQuery,
  GetPriceQuery,
  ValidatePricingInput,
} from '../../sdk/pricing/dto';
import type { CouponCode, MenuItemId, PriceListId } from '../../sdk/pricing/types/branded';
import type { Money } from '../../sdk/pricing/dto/money';

export type PricingSessionStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
  | 'disabled'
  | 'retry'
  | 'cancelled';

export type PricingFacadeOperation =
  | 'getPrice'
  | 'calculatePrice'
  | 'validatePricing'
  | 'getPriceList'
  | 'applyCoupon'
  | 'getDeliveryCharge'
  | 'getPackagingCharge';

export interface PricingFacadeContext {
  readonly tenantId: string;
  readonly branchId?: string;
  readonly regionCode?: string;
  readonly priceListId?: string;
}

export interface GetPriceFacadeQuery extends PricingFacadeContext {
  readonly itemId: string;
  readonly quantity?: number;
}

export interface CalculatePriceFacadeQuery extends PricingFacadeContext {
  readonly itemId: string;
  readonly quantity: number;
  readonly modifierAmount?: Money;
}

export interface ValidatePricingFacadeQuery extends PricingFacadeContext {
  readonly lines: ReadonlyArray<{
    readonly itemId: string;
    readonly quantity: number;
    readonly unitPrice: Money;
  }>;
}

export interface GetPriceListFacadeQuery extends PricingFacadeContext {
  readonly priceListId: string;
}

export interface ApplyCouponFacadeQuery extends PricingFacadeContext {
  readonly couponCode: string;
  readonly subtotal: Money;
}

export interface GetDeliveryChargeFacadeQuery extends PricingFacadeContext {
  readonly orderSubtotal: Money;
  readonly distanceKm?: number;
}

export interface GetPackagingChargeFacadeQuery extends PricingFacadeContext {
  readonly orderSubtotal: Money;
  readonly itemCount: number;
}

export type PricingFacadeRequest =
  | { readonly operation: 'getPrice'; readonly query: GetPriceFacadeQuery }
  | { readonly operation: 'calculatePrice'; readonly query: CalculatePriceFacadeQuery }
  | { readonly operation: 'validatePricing'; readonly query: ValidatePricingFacadeQuery }
  | { readonly operation: 'getPriceList'; readonly query: GetPriceListFacadeQuery }
  | { readonly operation: 'applyCoupon'; readonly query: ApplyCouponFacadeQuery }
  | { readonly operation: 'getDeliveryCharge'; readonly query: GetDeliveryChargeFacadeQuery }
  | { readonly operation: 'getPackagingCharge'; readonly query: GetPackagingChargeFacadeQuery };

export type PricingPresentationErrorCode =
  | 'NOT_FOUND'
  | 'UNAVAILABLE'
  | 'VALIDATION'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN';

export interface PricingPresentationError {
  readonly code: PricingPresentationErrorCode;
  readonly message: string;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly featureDisabled?: boolean;
}

export interface PricingFacadeSuccess<T> {
  readonly ok: true;
  readonly value: T;
}

export interface PricingFacadeFailure {
  readonly ok: false;
  readonly error: PricingPresentationError;
}

export type PricingFacadeOutcome<T> = PricingFacadeSuccess<T> | PricingFacadeFailure;

export interface PricingSessionSnapshot {
  readonly status: PricingSessionStatus;
  readonly currentRequest: PricingFacadeRequest | null;
  readonly lastRequest: PricingFacadeRequest | null;
  readonly lastResult: unknown | null;
  readonly lastError: PricingPresentationError | null;
  readonly retryCount: number;
  readonly lastAttemptAt: number | null;
  readonly lastSuccessAt: number | null;
  readonly telemetryId: string | null;
}

export const EMPTY_PRICING_SESSION: PricingSessionSnapshot = {
  status: 'idle',
  currentRequest: null,
  lastRequest: null,
  lastResult: null,
  lastError: null,
  retryCount: 0,
  lastAttemptAt: null,
  lastSuccessAt: null,
  telemetryId: null,
};

const toTenantId = (tenantId: string): TenantId => tenantId as TenantId;

const baseContext = (query: PricingFacadeContext) => ({
  tenantId: toTenantId(query.tenantId),
  branchId: query.branchId,
  regionCode: query.regionCode,
  priceListId: query.priceListId as PriceListId | undefined,
});

export const buildGetPriceQuery = (query: GetPriceFacadeQuery): GetPriceQuery => ({
  ...baseContext(query),
  itemId: query.itemId as MenuItemId,
  quantity: query.quantity,
});

export const buildCalculatePriceQuery = (query: CalculatePriceFacadeQuery): CalculatePriceQuery => ({
  ...baseContext(query),
  itemId: query.itemId as MenuItemId,
  quantity: query.quantity,
  modifierAmount: query.modifierAmount,
});

export const buildValidatePricingInput = (
  query: ValidatePricingFacadeQuery
): ValidatePricingInput => ({
  ...baseContext(query),
  lines: query.lines.map((line) => ({
    itemId: line.itemId as MenuItemId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  })),
});

export const buildApplyCouponQuery = (query: ApplyCouponFacadeQuery): ApplyCouponQuery => ({
  ...baseContext(query),
  couponCode: query.couponCode as CouponCode,
  subtotal: query.subtotal,
});

export const buildDeliveryFeeQuery = (
  query: GetDeliveryChargeFacadeQuery
): CalculateDeliveryFeeQuery => ({
  ...baseContext(query),
  orderSubtotal: query.orderSubtotal,
  distanceKm: query.distanceKm,
});

export const buildPackagingFeeQuery = (
  query: GetPackagingChargeFacadeQuery
): CalculatePackagingFeeQuery => ({
  ...baseContext(query),
  orderSubtotal: query.orderSubtotal,
  itemCount: query.itemCount,
});

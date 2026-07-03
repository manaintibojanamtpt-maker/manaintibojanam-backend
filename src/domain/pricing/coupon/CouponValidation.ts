/**
 * Domain — Coupon validation (M8 PR-2).
 */

import { validateDiscount } from '../discount/DiscountValidation';
import { PRICING_REASON_CODES } from '../shared/PricingReasonCodes';
import {
  mergePricingValidationResults,
  pricingValidationFailure,
  pricingValidationSuccess,
  type PricingDomainValidationResult,
} from '../shared/PricingDomainResult';
import type { Coupon, CouponEligibility } from './Coupon';

const isExpired = (expiresAt: string | undefined, nowIso: string): boolean => {
  if (!expiresAt) return false;
  return Date.parse(expiresAt) < Date.parse(nowIso);
};

export const validateCouponEligibility = (
  eligibility: CouponEligibility
): PricingDomainValidationResult => {
  const errors = [];
  if (!eligibility.tenantId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_COUPON,
      message: 'Tenant id is required for coupon eligibility',
      field: 'tenantId',
    });
  }
  if (
    eligibility.minOrderAmount !== undefined &&
    (!Number.isFinite(eligibility.minOrderAmount) || eligibility.minOrderAmount < 0)
  ) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_COUPON,
      message: 'Minimum order amount must be non-negative',
      field: 'minOrderAmount',
    });
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

export const validateCoupon = (
  coupon: Coupon,
  nowIso = new Date(0).toISOString()
): PricingDomainValidationResult => {
  const errors = [];
  if (!coupon.couponCode?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_COUPON,
      message: 'Coupon code is required',
      field: 'couponCode',
    });
  }
  if (!coupon.enabled) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_COUPON,
      message: 'Coupon is not enabled',
      field: 'enabled',
    });
  }
  if (!coupon.active) {
    errors.push({
      code: PRICING_REASON_CODES.COUPON_INACTIVE,
      message: 'Coupon is inactive',
      field: 'active',
    });
  }
  if (isExpired(coupon.expiresAt, nowIso)) {
    errors.push({
      code: PRICING_REASON_CODES.COUPON_EXPIRED,
      message: 'Coupon has expired',
      field: 'expiresAt',
    });
  }
  if (
    coupon.usageLimit &&
    coupon.usageLimit.usedCount >= coupon.usageLimit.maxUses
  ) {
    errors.push({
      code: PRICING_REASON_CODES.COUPON_USAGE_EXCEEDED,
      message: 'Coupon usage limit exceeded',
      field: 'usageLimit',
    });
  }
  if (errors.length > 0) {
    return pricingValidationFailure(errors);
  }
  return mergePricingValidationResults(
    validateDiscount(coupon.discount),
    validateCouponEligibility(coupon.eligibility)
  );
};

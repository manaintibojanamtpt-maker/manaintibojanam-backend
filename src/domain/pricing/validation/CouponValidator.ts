/**
 * Pricing domain — Coupon validator facade (M8 PR-2).
 */

import { validateCoupon, validateCouponEligibility } from '../coupon/CouponValidation';
import type { Coupon, CouponEligibility } from '../coupon/Coupon';
import type { PricingDomainValidationResult } from '../shared/PricingDomainResult';

export class CouponValidator {
  validate(coupon: Coupon, nowIso?: string): PricingDomainValidationResult {
    return validateCoupon(coupon, nowIso);
  }

  validateEligibility(eligibility: CouponEligibility): PricingDomainValidationResult {
    return validateCouponEligibility(eligibility);
  }
}

export const couponValidator = new CouponValidator();

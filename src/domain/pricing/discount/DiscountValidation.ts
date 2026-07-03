/**
 * Domain — Discount validation (M8 PR-2).
 */

import { PRICING_REASON_CODES } from '../shared/PricingReasonCodes';
import {
  pricingValidationFailure,
  pricingValidationSuccess,
  type PricingDomainValidationResult,
} from '../shared/PricingDomainResult';
import type { Discount, DiscountPolicy } from './Discount';

const VALID_TYPES = new Set(['percentage', 'fixed']);

export const validateDiscount = (discount: Discount): PricingDomainValidationResult => {
  const errors = [];
  if (!discount.discountId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DISCOUNT,
      message: 'Discount id is required',
      field: 'discountId',
    });
  }
  if (!VALID_TYPES.has(discount.type)) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DISCOUNT_TYPE,
      message: 'Discount type must be percentage or fixed',
      field: 'type',
    });
  }
  if (!Number.isFinite(discount.value) || discount.value < 0) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DISCOUNT,
      message: 'Discount value must be non-negative',
      field: 'value',
    });
  }
  if (discount.type === 'percentage' && discount.value > 100) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DISCOUNT,
      message: 'Percentage discount cannot exceed 100',
      field: 'value',
    });
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

export const validateDiscountPolicy = (policy: DiscountPolicy): PricingDomainValidationResult => {
  const errors = [];
  if (!policy.policyId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DISCOUNT_POLICY,
      message: 'Policy id is required',
      field: 'policyId',
    });
  }
  if (
    policy.maxDiscountPercent !== undefined &&
    (!Number.isFinite(policy.maxDiscountPercent) ||
      policy.maxDiscountPercent < 0 ||
      policy.maxDiscountPercent > 100)
  ) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DISCOUNT_POLICY,
      message: 'Max discount percent must be between 0 and 100',
      field: 'maxDiscountPercent',
    });
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

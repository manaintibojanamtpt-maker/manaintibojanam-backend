/**
 * Legacy pricing rules re-export (M8 PR-2).
 * Prefer module-specific validators and PricingDomainValidator.
 */

export { validateMoney, validateCurrency } from '../money/MoneyValidation';
export {
  validateBasePrice,
  validateEffectivePrice,
  validatePriceSnapshot,
  validatePriceList,
  validateBranchPriceOverride,
} from '../pricing/PricingValidation';
export { validateDiscount, validateDiscountPolicy } from '../discount/DiscountValidation';
export { validateCoupon, validateCouponEligibility } from '../coupon/CouponValidation';

/** @deprecated Use PricingDomainValidationResult from shared/PricingDomainResult */
export interface PricingValidationIssue {
  readonly code: string;
  readonly message: string;
}

export const toValidationIssue = (
  result: import('../shared/PricingDomainResult').PricingDomainValidationResult
): PricingValidationIssue | null => {
  if (result.valid) return null;
  const first = result.errors[0];
  return first ? { code: first.code, message: first.message } : null;
};

/** @deprecated Use validateBasePrice or PricingDomainValidator.validateBasePrice */
export { validateBasePrice as validatePrice } from '../pricing/PricingValidation';

/**
 * Pricing domain — Discount validator facade (M8 PR-2).
 */

import { validateDiscount, validateDiscountPolicy } from '../discount/DiscountValidation';
import type { Discount, DiscountPolicy } from '../discount/Discount';
import type { PricingDomainValidationResult } from '../shared/PricingDomainResult';

export class DiscountValidator {
  validate(discount: Discount): PricingDomainValidationResult {
    return validateDiscount(discount);
  }

  validatePolicy(policy: DiscountPolicy): PricingDomainValidationResult {
    return validateDiscountPolicy(policy);
  }
}

export const discountValidator = new DiscountValidator();

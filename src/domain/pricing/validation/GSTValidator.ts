/**
 * Pricing domain — GST validator facade (M8 PR-2).
 */

import {
  validateGSTBreakdown,
  validateGSTCategory,
  validateGSTRate,
} from '../gst/GSTValidation';
import type { GSTBreakdown, GSTCategory, GSTRate } from '../gst/GST';
import type { PricingDomainValidationResult } from '../shared/PricingDomainResult';

export class GSTValidator {
  validateRate(rate: GSTRate): PricingDomainValidationResult {
    return validateGSTRate(rate);
  }

  validateCategory(category: GSTCategory): PricingDomainValidationResult {
    return validateGSTCategory(category);
  }

  validateBreakdown(breakdown: GSTBreakdown): PricingDomainValidationResult {
    return validateGSTBreakdown(breakdown);
  }
}

export const gstValidator = new GSTValidator();

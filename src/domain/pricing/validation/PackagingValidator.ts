/**
 * Pricing domain — Packaging validator facade (M8 PR-2).
 */

import { validatePackagingCharge, validatePackagingRule } from '../packaging/PackagingValidation';
import type { PackagingCharge, PackagingRule } from '../packaging/Packaging';
import type { PricingDomainValidationResult } from '../shared/PricingDomainResult';

export class PackagingValidator {
  validateRule(rule: PackagingRule): PricingDomainValidationResult {
    return validatePackagingRule(rule);
  }

  validateCharge(charge: PackagingCharge): PricingDomainValidationResult {
    return validatePackagingCharge(charge);
  }
}

export const packagingValidator = new PackagingValidator();

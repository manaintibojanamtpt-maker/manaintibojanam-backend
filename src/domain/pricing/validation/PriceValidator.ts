/**
 * Pricing domain — Price validator facade (M8 PR-2).
 */

import {
  validateBasePrice,
  validateBranchPriceOverride,
  validateEffectivePrice,
  validatePriceList,
  validatePriceSnapshot,
} from '../pricing/PricingValidation';
import type {
  BasePrice,
  BranchPriceOverride,
  EffectivePrice,
  PriceList,
  PriceSnapshot,
} from '../pricing/Pricing';
import type { PricingDomainValidationResult } from '../shared/PricingDomainResult';

export class PriceValidator {
  validateBase(price: BasePrice): PricingDomainValidationResult {
    return validateBasePrice(price);
  }

  validateEffective(price: EffectivePrice): PricingDomainValidationResult {
    return validateEffectivePrice(price);
  }

  validateSnapshot(snapshot: PriceSnapshot): PricingDomainValidationResult {
    return validatePriceSnapshot(snapshot);
  }

  validatePriceList(priceList: PriceList): PricingDomainValidationResult {
    return validatePriceList(priceList);
  }

  validateBranchOverride(override: BranchPriceOverride): PricingDomainValidationResult {
    return validateBranchPriceOverride(override);
  }
}

export const priceValidator = new PriceValidator();

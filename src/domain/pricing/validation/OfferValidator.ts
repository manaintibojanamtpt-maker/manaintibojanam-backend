/**
 * Pricing domain — Offer validator facade (M8 PR-2).
 */

import { validateOffer, validateOfferRule } from '../offer/OfferValidation';
import type { Offer, OfferRule } from '../offer/Offer';
import type { PricingDomainValidationResult } from '../shared/PricingDomainResult';

export class OfferValidator {
  validate(offer: Offer): PricingDomainValidationResult {
    return validateOffer(offer);
  }

  validateRule(rule: OfferRule): PricingDomainValidationResult {
    return validateOfferRule(rule);
  }
}

export const offerValidator = new OfferValidator();

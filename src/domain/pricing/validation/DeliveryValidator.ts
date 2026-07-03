/**
 * Pricing domain — Delivery validator facade (M8 PR-2).
 */

import {
  validateDeliveryCharge,
  validateDeliveryRule,
  validateDeliveryZone,
} from '../delivery/DeliveryValidation';
import type { DeliveryCharge, DeliveryRule, DeliveryZone } from '../delivery/Delivery';
import type { PricingDomainValidationResult } from '../shared/PricingDomainResult';

export class DeliveryValidator {
  validateZone(zone: DeliveryZone): PricingDomainValidationResult {
    return validateDeliveryZone(zone);
  }

  validateRule(rule: DeliveryRule): PricingDomainValidationResult {
    return validateDeliveryRule(rule);
  }

  validateCharge(charge: DeliveryCharge): PricingDomainValidationResult {
    return validateDeliveryCharge(charge);
  }
}

export const deliveryValidator = new DeliveryValidator();

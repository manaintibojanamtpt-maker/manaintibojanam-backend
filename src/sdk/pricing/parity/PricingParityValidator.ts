/**
 * Pricing parity validator (M8 PR-8).
 */

import type { PricingParityValidatorPort, PricingParityValidateResult } from './pricingParityPorts';
import type { SdkResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class PricingParityValidator implements PricingParityValidatorPort {
  validatePriceListId(priceListId: string): SdkResult<PricingParityValidateResult> {
    if (!priceListId || !priceListId.trim()) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'priceListId is required' },
      };
    }
    return sdkOk({ priceListId, valid: true });
  }
}

export function createPricingParityValidator(): PricingParityValidator {
  return new PricingParityValidator();
}

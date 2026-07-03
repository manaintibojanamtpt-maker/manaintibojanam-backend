/**
 * Pricing domain — Money validator facade (M8 PR-2).
 */

import { validateCurrency, validateMoney } from '../money/MoneyValidation';
import type { Currency, Money } from '../money/Money';
import type { PricingDomainValidationResult } from '../shared/PricingDomainResult';

export class MoneyValidator {
  validate(money: Money): PricingDomainValidationResult {
    return validateMoney(money);
  }

  validateCurrency(currency: Currency): PricingDomainValidationResult {
    return validateCurrency(currency);
  }
}

export const moneyValidator = new MoneyValidator();

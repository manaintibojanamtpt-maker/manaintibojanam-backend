/**
 * Domain — Money validation (M8 PR-2).
 */

import { PRICING_DECIMAL_PRECISION_DEFAULT } from '../shared/PricingDomainConstants';
import { PRICING_REASON_CODES } from '../shared/PricingReasonCodes';
import {
  pricingValidationFailure,
  pricingValidationSuccess,
  type PricingDomainValidationResult,
} from '../shared/PricingDomainResult';
import type { Currency, Money } from './Money';

const countDecimalPlaces = (amount: number): number => {
  const parts = String(amount).split('.');
  return parts.length > 1 ? parts[1].length : 0;
};

export const validateMoney = (money: Money): PricingDomainValidationResult => {
  const errors = [];
  if (!Number.isFinite(money.amount) || money.amount < 0) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_MONEY,
      message: 'Amount must be a non-negative finite number',
      field: 'amount',
    });
  }
  if (!money.currency?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_CURRENCY,
      message: 'Currency is required',
      field: 'currency',
    });
  }
  if (Number.isFinite(money.amount) && countDecimalPlaces(money.amount) > PRICING_DECIMAL_PRECISION_DEFAULT) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DECIMAL_PRECISION,
      message: `Amount exceeds ${PRICING_DECIMAL_PRECISION_DEFAULT} decimal places`,
      field: 'amount',
    });
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

export const validateCurrency = (currency: Currency): PricingDomainValidationResult => {
  const errors = [];
  if (!currency.code?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_CURRENCY,
      message: 'Currency code is required',
      field: 'code',
    });
  }
  if (!Number.isInteger(currency.decimalPlaces) || currency.decimalPlaces < 0) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DECIMAL_PRECISION,
      message: 'Decimal places must be a non-negative integer',
      field: 'decimalPlaces',
    });
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

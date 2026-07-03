/**
 * Domain — GST validation (M8 PR-2).
 */

import { PRICING_REASON_CODES } from '../shared/PricingReasonCodes';
import {
  pricingValidationFailure,
  pricingValidationSuccess,
  type PricingDomainValidationResult,
} from '../shared/PricingDomainResult';
import type { GSTBreakdown, GSTCategory, GSTRate } from './GST';

const isValidRatePercent = (value: number): boolean =>
  Number.isFinite(value) && value >= 0 && value <= 100;

export const validateGSTRate = (rate: GSTRate): PricingDomainValidationResult => {
  const errors = [];
  if (!rate.categoryCode?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_GST_CATEGORY,
      message: 'GST category code is required',
      field: 'categoryCode',
    });
  }
  for (const [field, value] of [
    ['cgstPercent', rate.cgstPercent],
    ['sgstPercent', rate.sgstPercent],
    ['igstPercent', rate.igstPercent],
  ] as const) {
    if (!isValidRatePercent(value)) {
      errors.push({
        code: PRICING_REASON_CODES.INVALID_GST_RATE,
        message: `${field} must be between 0 and 100`,
        field,
      });
    }
  }
  if (rate.cessPercent !== undefined && !isValidRatePercent(rate.cessPercent)) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_GST_RATE,
      message: 'cessPercent must be between 0 and 100',
      field: 'cessPercent',
    });
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

export const validateGSTCategory = (category: GSTCategory): PricingDomainValidationResult => {
  const errors = [];
  if (!category.code?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_GST_CATEGORY,
      message: 'Category code is required',
      field: 'code',
    });
  }
  if (!category.label?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_GST_CATEGORY,
      message: 'Category label is required',
      field: 'label',
    });
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

export const validateGSTBreakdown = (breakdown: GSTBreakdown): PricingDomainValidationResult => {
  const rateResult = validateGSTRate(breakdown.rate);
  const errors = [...rateResult.errors];
  if (!Number.isFinite(breakdown.taxableAmount) || breakdown.taxableAmount < 0) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_GST_BREAKDOWN,
      message: 'Taxable amount must be non-negative',
      field: 'taxableAmount',
    });
  }
  for (const [field, value] of [
    ['cgstAmount', breakdown.cgstAmount],
    ['sgstAmount', breakdown.sgstAmount],
    ['igstAmount', breakdown.igstAmount],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      errors.push({
        code: PRICING_REASON_CODES.INVALID_GST_BREAKDOWN,
        message: `${field} must be non-negative`,
        field,
      });
    }
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

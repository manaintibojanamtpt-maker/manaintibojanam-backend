/**
 * Domain — Packaging validation (M8 PR-2).
 */

import { validateMoney } from '../money/MoneyValidation';
import { PRICING_REASON_CODES } from '../shared/PricingReasonCodes';
import {
  mergePricingValidationResults,
  pricingValidationFailure,
  pricingValidationSuccess,
  type PricingDomainValidationResult,
} from '../shared/PricingDomainResult';
import type { PackagingCharge, PackagingRule } from './Packaging';

export const validatePackagingRule = (rule: PackagingRule): PricingDomainValidationResult => {
  const errors = [];
  if (!rule.ruleId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_PACKAGING_RULE,
      message: 'Rule id is required',
      field: 'ruleId',
    });
  }
  if (!rule.label?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_PACKAGING_RULE,
      message: 'Rule label is required',
      field: 'label',
    });
  }
  if (errors.length > 0) {
    return pricingValidationFailure(errors);
  }
  const results = [validateMoney(rule.flatCharge)];
  if (rule.perItemCharge) {
    results.push(validateMoney(rule.perItemCharge));
  }
  return mergePricingValidationResults(...results);
};

export const validatePackagingCharge = (
  charge: PackagingCharge
): PricingDomainValidationResult => {
  const errors = [];
  if (!charge.chargeId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_PACKAGING_CHARGE,
      message: 'Charge id is required',
      field: 'chargeId',
    });
  }
  if (!charge.ruleId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_PACKAGING_CHARGE,
      message: 'Rule id is required',
      field: 'ruleId',
    });
  }
  if (errors.length > 0) {
    return pricingValidationFailure(errors);
  }
  return mergePricingValidationResults(validateMoney(charge.amount));
};

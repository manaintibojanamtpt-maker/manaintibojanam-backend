/**
 * Domain — Delivery validation (M8 PR-2).
 */

import { validateMoney } from '../money/MoneyValidation';
import { PRICING_REASON_CODES } from '../shared/PricingReasonCodes';
import {
  mergePricingValidationResults,
  pricingValidationFailure,
  pricingValidationSuccess,
  type PricingDomainValidationResult,
} from '../shared/PricingDomainResult';
import type { DeliveryCharge, DeliveryRule, DeliveryZone } from './Delivery';

export const validateDeliveryZone = (zone: DeliveryZone): PricingDomainValidationResult => {
  const errors = [];
  if (!zone.zoneId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DELIVERY_ZONE,
      message: 'Zone id is required',
      field: 'zoneId',
    });
  }
  if (!zone.name?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DELIVERY_ZONE,
      message: 'Zone name is required',
      field: 'name',
    });
  }
  if (!zone.regionCode?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DELIVERY_ZONE,
      message: 'Region code is required',
      field: 'regionCode',
    });
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

export const validateDeliveryRule = (rule: DeliveryRule): PricingDomainValidationResult => {
  const errors = [];
  if (!rule.ruleId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DELIVERY_RULE,
      message: 'Rule id is required',
      field: 'ruleId',
    });
  }
  if (!rule.zoneId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DELIVERY_RULE,
      message: 'Zone id is required',
      field: 'zoneId',
    });
  }
  if (errors.length > 0) {
    return pricingValidationFailure(errors);
  }
  const results = [validateMoney(rule.flatCharge)];
  if (rule.minOrderAmount) {
    results.push(validateMoney(rule.minOrderAmount));
  }
  return mergePricingValidationResults(...results);
};

export const validateDeliveryCharge = (charge: DeliveryCharge): PricingDomainValidationResult => {
  const errors = [];
  if (!charge.chargeId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DELIVERY_CHARGE,
      message: 'Charge id is required',
      field: 'chargeId',
    });
  }
  if (!charge.ruleId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_DELIVERY_CHARGE,
      message: 'Rule id is required',
      field: 'ruleId',
    });
  }
  if (errors.length > 0) {
    return pricingValidationFailure(errors);
  }
  return mergePricingValidationResults(validateMoney(charge.amount));
};

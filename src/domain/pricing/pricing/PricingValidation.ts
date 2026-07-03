/**
 * Domain — Pricing validation (M8 PR-2).
 */

import { validateMoney } from '../money/MoneyValidation';
import { PRICING_REASON_CODES } from '../shared/PricingReasonCodes';
import {
  mergePricingValidationResults,
  pricingValidationFailure,
  pricingValidationSuccess,
  type PricingDomainValidationResult,
} from '../shared/PricingDomainResult';
import type {
  BasePrice,
  BranchPriceOverride,
  EffectivePrice,
  PriceList,
  PriceSnapshot,
} from './Pricing';

export const validateBasePrice = (price: BasePrice): PricingDomainValidationResult =>
  mergePricingValidationResults(validateMoney(price.amount));

export const validateEffectivePrice = (price: EffectivePrice): PricingDomainValidationResult =>
  mergePricingValidationResults(
    validateMoney(price.baseAmount),
    validateMoney(price.effectiveAmount)
  );

export const validatePriceSnapshot = (snapshot: PriceSnapshot): PricingDomainValidationResult =>
  mergePricingValidationResults(
    validateMoney(snapshot.baseAmount),
    validateMoney(snapshot.effectiveAmount)
  );

export const validatePriceList = (priceList: PriceList): PricingDomainValidationResult => {
  const errors = [];
  if (!priceList.priceListId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_PRICE_LIST,
      message: 'Price list id is required',
      field: 'priceListId',
    });
  }
  if (!priceList.tenantId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_PRICE_LIST,
      message: 'Tenant id is required',
      field: 'tenantId',
    });
  }
  if (!priceList.prices.length) {
    errors.push({
      code: PRICING_REASON_CODES.EMPTY_PRICE_LIST,
      message: 'Price list must contain at least one price',
      field: 'prices',
    });
  }
  if (errors.length > 0) {
    return pricingValidationFailure(errors);
  }
  for (const entry of priceList.prices) {
    const result = validateBasePrice({ itemId: entry.itemId, amount: entry.baseAmount });
    if (!result.valid) return result;
  }
  return pricingValidationSuccess();
};

export const validateBranchPriceOverride = (
  override: BranchPriceOverride
): PricingDomainValidationResult => {
  const errors = [];
  if (!override.branchId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_BRANCH_OVERRIDE,
      message: 'Branch id is required',
      field: 'branchId',
    });
  }
  if (!override.itemId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_BRANCH_OVERRIDE,
      message: 'Item id is required',
      field: 'itemId',
    });
  }
  if (errors.length > 0) {
    return pricingValidationFailure(errors);
  }
  return mergePricingValidationResults(validateMoney(override.overrideAmount));
};

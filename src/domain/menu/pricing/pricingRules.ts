/**
 * Menu domain — price validation rules (M7 PR-2).
 */

import { MENU_REASON_CODES } from '../shared/MenuReasonCodes';
import {
  menuDomainFail,
  menuDomainOk,
  type MenuDomainResult,
  type MenuDomainValidationResult,
  menuValidationFailure,
  menuValidationSuccess,
} from '../shared/MenuDomainResult';
import type { EffectivePrice, PriceSnapshot } from './PriceSnapshot';

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const validatePriceSnapshot = (price: PriceSnapshot): MenuDomainValidationResult => {
  const errors = [];
  if (!Number.isFinite(price.amount) || price.amount < 0) {
    errors.push({
      code: MENU_REASON_CODES.INVALID_PRICE,
      message: 'Price amount must be a non-negative finite number',
      field: 'amount',
    });
  }
  if (!isNonEmptyString(price.currency)) {
    errors.push({
      code: MENU_REASON_CODES.INVALID_CURRENCY,
      message: 'Currency code is required',
      field: 'currency',
    });
  }
  return errors.length === 0 ? menuValidationSuccess() : menuValidationFailure(errors);
};

export const validateEffectivePrice = (price: EffectivePrice): MenuDomainValidationResult => {
  const base = validatePriceSnapshot(price.base);
  const finalPrice = validatePriceSnapshot(price.final);
  return {
    valid: base.valid && finalPrice.valid,
    errors: [...base.errors, ...finalPrice.errors],
  };
};

export const createEffectivePrice = (base: PriceSnapshot): MenuDomainResult<EffectivePrice> => {
  const validation = validatePriceSnapshot(base);
  if (!validation.valid) {
    return menuDomainFail(validation.errors[0]!.code, validation.errors[0]!.message, validation.errors[0]!.field);
  }
  return menuDomainOk({
    base,
    final: base,
    discountApplied: false,
  });
};

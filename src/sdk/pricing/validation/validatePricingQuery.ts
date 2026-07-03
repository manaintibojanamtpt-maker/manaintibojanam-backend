/**
 * PricingSDK — query validation (M8 PR-1).
 * Structural validation only — no pricing calculations.
 */

import type { SdkResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import type {
  CalculatePriceQuery,
  GetPriceQuery,
  ValidatePricingInput,
} from '../dto';
import { PRICING_ERROR_MESSAGES } from '../errors/pricingErrors';

export function validateGetPriceQuery(query: GetPriceQuery): SdkResult<GetPriceQuery> {
  if (!query.tenantId?.trim()) {
    return sdkFail(sdkError('VALIDATION', PRICING_ERROR_MESSAGES.VALIDATION, { field: 'tenantId' }));
  }
  if (!query.itemId?.trim()) {
    return sdkFail(sdkError('VALIDATION', PRICING_ERROR_MESSAGES.VALIDATION, { field: 'itemId' }));
  }
  if (query.quantity !== undefined && query.quantity <= 0) {
    return sdkFail(sdkError('VALIDATION', PRICING_ERROR_MESSAGES.VALIDATION, { field: 'quantity' }));
  }
  return sdkOk(query);
}

export function validateCalculatePriceQuery(
  query: CalculatePriceQuery
): SdkResult<CalculatePriceQuery> {
  if (!query.tenantId?.trim()) {
    return sdkFail(sdkError('VALIDATION', PRICING_ERROR_MESSAGES.VALIDATION, { field: 'tenantId' }));
  }
  if (!query.itemId?.trim()) {
    return sdkFail(sdkError('VALIDATION', PRICING_ERROR_MESSAGES.VALIDATION, { field: 'itemId' }));
  }
  if (query.quantity <= 0) {
    return sdkFail(sdkError('VALIDATION', PRICING_ERROR_MESSAGES.VALIDATION, { field: 'quantity' }));
  }
  if (query.modifierAmount !== undefined && query.modifierAmount.amount < 0) {
    return sdkFail(sdkError('VALIDATION', PRICING_ERROR_MESSAGES.INVALID_MONEY, { field: 'modifierAmount' }));
  }
  return sdkOk(query);
}

export function validatePricingInput(input: ValidatePricingInput): SdkResult<ValidatePricingInput> {
  if (!input.tenantId?.trim()) {
    return sdkFail(sdkError('VALIDATION', PRICING_ERROR_MESSAGES.VALIDATION, { field: 'tenantId' }));
  }
  if (!input.lines?.length) {
    return sdkFail(sdkError('VALIDATION', PRICING_ERROR_MESSAGES.VALIDATION, { field: 'lines' }));
  }
  for (const line of input.lines) {
    if (line.quantity <= 0) {
      return sdkFail(sdkError('VALIDATION', PRICING_ERROR_MESSAGES.VALIDATION, { field: 'quantity' }));
    }
    if (line.unitPrice.amount < 0) {
      return sdkFail(sdkError('VALIDATION', PRICING_ERROR_MESSAGES.INVALID_MONEY, { field: 'unitPrice' }));
    }
  }
  return sdkOk(input);
}

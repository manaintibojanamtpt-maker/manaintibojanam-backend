/**
 * PricingSDK — SDK DTO ↔ domain mapping (M8 PR-4).
 * Structural mapping only — no business logic.
 */

import type { Money as DomainMoney } from '../../../domain/pricing/money/Money';
import type { EffectivePrice as DomainEffectivePrice } from '../../../domain/pricing/pricing/Pricing';
import type { PricingDomainValidationResult } from '../../../domain/pricing/shared/PricingDomainResult';
import type {
  Money,
  PriceCalculation,
  PriceResult,
  PricingValidationResult,
  ValidatePricingInput,
} from '../dto';
import type { MenuItemId } from '../types/branded';

export const mapMoneyDtoToDomain = (money: Money): DomainMoney => ({
  amount: money.amount,
  currency: money.currency,
});

export const mapPriceResultDtoToDomainEffectivePrice = (
  itemId: MenuItemId,
  result: PriceResult
): DomainEffectivePrice => ({
  itemId: String(itemId),
  baseAmount: mapMoneyDtoToDomain(result.unitPrice),
  effectiveAmount: mapMoneyDtoToDomain(result.unitPrice),
});

export const mapPriceCalculationDtoToDomainEffectivePrice = (
  itemId: MenuItemId,
  calculation: PriceCalculation
): DomainEffectivePrice => ({
  itemId: String(itemId),
  baseAmount: mapMoneyDtoToDomain(calculation.basePrice),
  effectiveAmount: mapMoneyDtoToDomain(calculation.totalPrice),
});

export const mapValidatePricingInputToDomainLines = (
  input: ValidatePricingInput
): ReadonlyArray<{ itemId: string; effective: DomainEffectivePrice }> =>
  input.lines.map((line) => ({
    itemId: String(line.itemId),
    effective: {
      itemId: String(line.itemId),
      baseAmount: mapMoneyDtoToDomain(line.unitPrice),
      effectiveAmount: mapMoneyDtoToDomain(line.unitPrice),
    },
  }));

export const mapDomainValidationToPricingValidationResult = (
  result: PricingDomainValidationResult
): PricingValidationResult => ({
  valid: result.valid,
  issues: result.errors.map((error) => ({
    code: String(error.code),
    message: error.message,
  })),
});

export const mergeDomainValidationResults = (
  results: readonly PricingDomainValidationResult[]
): PricingDomainValidationResult => {
  const errors = results.flatMap((result) => result.errors);
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * PricingSDK — orchestration layer (M8 PR-4).
 */

import { PricingDomainValidator } from '../../../domain/pricing/validation/PricingDomainValidator';
import { isSdkSuccess, sdkOk } from '../../core/resultHelpers';
import type { SdkAsyncResult, SdkFailure, SdkResult } from '../../core/result';
import { pricingNotConfiguredAsync } from '../adapters/notConfigured';
import type { PricingRepository } from '../contracts/ports';
import type {
  ApplyCouponQuery,
  CalculateDeliveryFeeQuery,
  CalculateFinalBillQuery,
  CalculatePackagingFeeQuery,
  CalculatePriceQuery,
  CalculateTaxesQuery,
  CouponApplication,
  FeeResult,
  FinalBill,
  GetPriceQuery,
  PriceCalculation,
  PriceResult,
  PricingValidationResult,
  TaxBreakdown,
  ValidatePricingInput,
} from '../dto';
import {
  validateCalculatePriceQuery,
  validateGetPriceQuery,
  validatePricingInput,
} from '../validation/validatePricingQuery';
import {
  mapDomainValidationToPricingValidationResult,
  mapPriceCalculationDtoToDomainEffectivePrice,
  mapPriceResultDtoToDomainEffectivePrice,
  mapValidatePricingInputToDomainLines,
  mergeDomainValidationResults,
} from './PricingDomainMapper';
import {
  mapDomainErrorToSdk,
  mapRepositoryResultToSdk,
  repositoryUnavailable,
} from './PricingErrorMapper';
import {
  createPricingPipelineTimer,
  createPricingTelemetryEmitter,
  type PricingTelemetryHook,
} from './PricingTelemetry';

const domainValidator = new PricingDomainValidator();

export interface PricingSdkOrchestratorDeps {
  readonly repository: PricingRepository;
  readonly repositoryEnabled: boolean;
  readonly onTelemetry?: PricingTelemetryHook;
}

const ensureRepositoryEnabled = (
  deps: PricingSdkOrchestratorDeps,
  method: string
): SdkResult<true> | null => {
  if (!deps.repositoryEnabled) {
    return repositoryUnavailable(method);
  }
  return null;
};

const failDomainValidation = (
  result: ReturnType<typeof domainValidator.validateMoney>
): SdkFailure | null => {
  if (result.valid) return null;
  return mapDomainErrorToSdk(
    result.errors[0] ?? { code: 'VALIDATION', message: 'Domain validation failed' }
  );
};

const validatePriceResultDomain = (query: GetPriceQuery, value: PriceResult): SdkFailure | null => {
  const moneyFailure =
    failDomainValidation(domainValidator.validateMoney(value.unitPrice)) ??
    failDomainValidation(domainValidator.validateMoney(value.totalPrice));
  if (moneyFailure) return moneyFailure;

  const effective = mapPriceResultDtoToDomainEffectivePrice(query.itemId, value);
  return failDomainValidation(domainValidator.validateEffectivePrice(effective));
};

const validatePriceCalculationDomain = (
  query: CalculatePriceQuery,
  value: PriceCalculation
): SdkFailure | null => {
  const moneyChecks = [
    domainValidator.validateMoney(value.basePrice),
    domainValidator.validateMoney(value.unitPrice),
    domainValidator.validateMoney(value.totalPrice),
  ];
  const merged = mergeDomainValidationResults(moneyChecks);
  if (!merged.valid) {
    return mapDomainErrorToSdk(merged.errors[0]!);
  }

  const effective = mapPriceCalculationDtoToDomainEffectivePrice(query.itemId, value);
  return failDomainValidation(domainValidator.validateEffectivePrice(effective));
};

export const orchestrateGetPrice = async (
  deps: PricingSdkOrchestratorDeps,
  query: GetPriceQuery
): SdkAsyncResult<PriceResult> => {
  const telemetry = createPricingTelemetryEmitter(deps.onTelemetry, 'getPrice');
  telemetry.request({ tenantId: String(query.tenantId), itemId: String(query.itemId) });

  const validationTimer = createPricingPipelineTimer();
  const validated = validateGetPriceQuery(query);
  const validationMs = validationTimer();
  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { tenantId: String(query.tenantId) });
    return validated;
  }
  telemetry.validationCompleted({ validationMs });

  const disabled = ensureRepositoryEnabled(deps, 'getPrice');
  if (disabled) {
    telemetry.failure(disabled.error.code, { tenantId: String(query.tenantId) });
    return disabled;
  }

  telemetry.repositoryRead({ tenantId: String(query.tenantId) });
  const repositoryTimer = createPricingPipelineTimer();
  const priceResult = mapRepositoryResultToSdk(await deps.repository.getPrice(validated.value));
  const repositoryMs = repositoryTimer();
  if (!isSdkSuccess(priceResult)) {
    telemetry.failure(priceResult.error.code, { tenantId: String(query.tenantId) });
    return priceResult;
  }

  const domainTimer = createPricingPipelineTimer();
  const domainFailure = validatePriceResultDomain(validated.value, priceResult.value);
  const domainMs = domainTimer();
  telemetry.validationCompleted({ domainMs });

  if (domainFailure) {
    telemetry.failure(domainFailure.error.code, { tenantId: String(query.tenantId) });
    return domainFailure;
  }

  telemetry.success({ validationMs, repositoryMs, domainMs }, { tenantId: String(query.tenantId) });
  return sdkOk(priceResult.value);
};

export const orchestrateCalculatePrice = async (
  deps: PricingSdkOrchestratorDeps,
  query: CalculatePriceQuery
): SdkAsyncResult<PriceCalculation> => {
  const telemetry = createPricingTelemetryEmitter(deps.onTelemetry, 'calculatePrice');
  telemetry.request({ tenantId: String(query.tenantId), itemId: String(query.itemId) });

  const validated = validateCalculatePriceQuery(query);
  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { tenantId: String(query.tenantId) });
    return validated;
  }

  const disabled = ensureRepositoryEnabled(deps, 'calculatePrice');
  if (disabled) {
    telemetry.failure(disabled.error.code, { tenantId: String(query.tenantId) });
    return disabled;
  }

  telemetry.repositoryRead({ tenantId: String(query.tenantId) });
  const calculationResult = mapRepositoryResultToSdk(
    await deps.repository.calculatePrice(validated.value)
  );
  if (!isSdkSuccess(calculationResult)) {
    telemetry.failure(calculationResult.error.code, { tenantId: String(query.tenantId) });
    return calculationResult;
  }

  const domainFailure = validatePriceCalculationDomain(validated.value, calculationResult.value);
  if (domainFailure) {
    telemetry.failure(domainFailure.error.code, { tenantId: String(query.tenantId) });
    return domainFailure;
  }

  telemetry.success(undefined, { tenantId: String(query.tenantId) });
  return sdkOk(calculationResult.value);
};

export const orchestrateApplyCoupon = (
  _deps: PricingSdkOrchestratorDeps,
  _query: ApplyCouponQuery
): SdkAsyncResult<CouponApplication> => {
  return pricingNotConfiguredAsync('applyCoupon', 'PricingCalculator');
};

export const orchestrateCalculateTaxes = (
  _deps: PricingSdkOrchestratorDeps,
  _query: CalculateTaxesQuery
): SdkAsyncResult<TaxBreakdown> => {
  return pricingNotConfiguredAsync('calculateTaxes', 'PricingCalculator');
};

export const orchestrateCalculateDeliveryFee = (
  _deps: PricingSdkOrchestratorDeps,
  _query: CalculateDeliveryFeeQuery
): SdkAsyncResult<FeeResult> => {
  return pricingNotConfiguredAsync('calculateDeliveryFee', 'PricingCalculator');
};

export const orchestrateCalculatePackagingFee = (
  _deps: PricingSdkOrchestratorDeps,
  _query: CalculatePackagingFeeQuery
): SdkAsyncResult<FeeResult> => {
  return pricingNotConfiguredAsync('calculatePackagingFee', 'PricingCalculator');
};

export const orchestrateCalculateFinalBill = (
  _deps: PricingSdkOrchestratorDeps,
  _query: CalculateFinalBillQuery
): SdkAsyncResult<FinalBill> => {
  return pricingNotConfiguredAsync('calculateFinalBill', 'PricingCalculator');
};

export const orchestrateValidatePricing = (
  deps: PricingSdkOrchestratorDeps,
  input: ValidatePricingInput
): SdkResult<PricingValidationResult> => {
  const telemetry = createPricingTelemetryEmitter(deps.onTelemetry, 'validatePricing');
  telemetry.request({ tenantId: String(input.tenantId) });

  const validated = validatePricingInput(input);
  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { tenantId: String(input.tenantId) });
    return validated;
  }

  const domainLines = mapValidatePricingInputToDomainLines(validated.value);
  const domainResults = domainLines.flatMap((line) => [
    domainValidator.validateMoney(line.effective.baseAmount),
    domainValidator.validateMoney(line.effective.effectiveAmount),
    domainValidator.validateEffectivePrice(line.effective),
  ]);
  const merged = mergeDomainValidationResults(domainResults);
  telemetry.validationCompleted();

  if (!merged.valid) {
    telemetry.failure('VALIDATION', { tenantId: String(input.tenantId) });
    return mapDomainErrorToSdk(merged.errors[0]!);
  }

  telemetry.success(undefined, { tenantId: String(input.tenantId) });
  return sdkOk(mapDomainValidationToPricingValidationResult(merged));
};

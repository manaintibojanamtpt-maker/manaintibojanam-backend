/**
 * M8 PR-5 — Pricing presentation facade.
 * Presentation MUST use this module — not PricingSDK, repository, or domain directly.
 */

import { createPricingSDK } from '../../sdk/pricing/factory/createPricingSDK';
import type { PricingSDK } from '../../sdk/pricing/contracts/PricingSDK';
import {
  PRICING_SDK_FEATURE_FLAG_DEFAULTS,
  PRICING_SDK_FEATURE_FLAG_ENV_KEYS,
  type PricingSdkFeatureFlag,
} from '../../sdk/pricing/featureFlags/featureFlags';
import { isSdkSuccess } from '../../sdk/core/resultHelpers';
import type {
  CouponApplication,
  FeeResult,
  PriceCalculation,
  PriceResult,
  PricingValidationResult,
} from '../../sdk/pricing/dto';
import {
  buildApplyCouponQuery,
  buildCalculatePriceQuery,
  buildDeliveryFeeQuery,
  buildGetPriceQuery,
  buildPackagingFeeQuery,
  buildValidatePricingInput,
  type ApplyCouponFacadeQuery,
  type CalculatePriceFacadeQuery,
  type GetDeliveryChargeFacadeQuery,
  type GetPackagingChargeFacadeQuery,
  type GetPriceFacadeQuery,
  type GetPriceListFacadeQuery,
  type PricingFacadeOutcome,
  type PricingFacadeRequest,
  type PricingSessionSnapshot,
  type ValidatePricingFacadeQuery,
} from './PricingContext';
import {
  normalizePricingError,
  pricingFeatureDisabledError,
  pricingInvalidQueryError,
  pricingOperationNotConfiguredError,
} from './PricingErrorMapper';
import {
  getLastPricingRequest,
  getPricingRetryCount,
  getPricingSessionSnapshot,
  markPricingDisabled,
  markPricingEmpty,
  markPricingError,
  markPricingLoading,
  markPricingRetry,
  markPricingSuccess,
  resetPricingSession,
  subscribePricingSession,
} from './PricingSession';
import {
  createPricingFacadeTelemetryEmitter,
  type PricingFacadeTelemetryHook,
} from './PricingTelemetry';

export interface PricingFacadeDeps {
  readonly sdk?: PricingSDK;
  readonly isEnabled?: () => boolean;
  readonly onTelemetry?: PricingFacadeTelemetryHook;
}

const DEFAULT_MAX_RETRIES = 3;

const createAttemptId = (): string =>
  `pricing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const readPricingFlag = (flag: PricingSdkFeatureFlag): boolean => {
  const envKey = PRICING_SDK_FEATURE_FLAG_ENV_KEYS[flag];
  const envValue =
    typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[envKey] : undefined;
  if (envValue === 'true') return true;
  if (envValue === 'false') return false;
  return PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags[flag];
};

export const isPricingEnabled = (): boolean => readPricingFlag('FF_PRICING_ENABLED');

export const createPricingFacadeDeps = (
  overrides: PricingFacadeDeps = {}
): Required<Omit<PricingFacadeDeps, 'onTelemetry'>> & Pick<PricingFacadeDeps, 'onTelemetry'> => ({
  sdk:
    overrides.sdk ??
    createPricingSDK({
      featureFlags: readPricingFlag,
    }),
  isEnabled: overrides.isEnabled ?? isPricingEnabled,
  onTelemetry: overrides.onTelemetry,
});

export class PricingFacade {
  private readonly deps: ReturnType<typeof createPricingFacadeDeps>;

  constructor(deps: PricingFacadeDeps = {}) {
    this.deps = createPricingFacadeDeps(deps);
  }

  private ensureEnabled(method: string, tenantId?: string): boolean {
    if (this.deps.isEnabled()) {
      return true;
    }
    const telemetry = createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    markPricingDisabled();
    telemetry.failure('NOT_CONFIGURED', tenantId);
    return false;
  }

  private handleFailure<T>(
    method: string,
    error: import('../../sdk/core/errors').SdkError,
    tenantId?: string
  ): PricingFacadeOutcome<T> {
    const presentationError = normalizePricingError(error);
    markPricingError(presentationError);
    createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, method).failure(
      presentationError.code,
      tenantId
    );
    return { ok: false, error: presentationError };
  }

  private handlePresentationFailure<T>(
    method: string,
    error: import('./PricingContext').PricingPresentationError,
    tenantId?: string
  ): PricingFacadeOutcome<T> {
    markPricingError(error);
    createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, method).failure(
      error.code,
      tenantId
    );
    return { ok: false, error };
  }

  async getPrice(query: GetPriceFacadeQuery): Promise<PricingFacadeOutcome<PriceResult>> {
    const method = 'getPrice';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: pricingFeatureDisabledError() };
    }

    const telemetry = createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    const request: PricingFacadeRequest = { operation: 'getPrice', query };
    markPricingLoading(request, createAttemptId());

    const sdkResult = await this.deps.sdk.getPrice(buildGetPriceQuery(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    if (sdkResult.value.totalPrice.amount === 0) {
      markPricingEmpty(sdkResult.value);
      telemetry.success(query.tenantId, 'empty');
      return { ok: true, value: sdkResult.value };
    }

    markPricingSuccess(sdkResult.value);
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  async calculatePrice(
    query: CalculatePriceFacadeQuery
  ): Promise<PricingFacadeOutcome<PriceCalculation>> {
    const method = 'calculatePrice';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: pricingFeatureDisabledError() };
    }

    const telemetry = createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    markPricingLoading({ operation: 'calculatePrice', query }, createAttemptId());

    const sdkResult = await this.deps.sdk.calculatePrice(buildCalculatePriceQuery(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    markPricingSuccess(sdkResult.value);
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  validatePricing(
    query: ValidatePricingFacadeQuery
  ): PricingFacadeOutcome<PricingValidationResult> {
    const method = 'validatePricing';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: pricingFeatureDisabledError() };
    }

    if (!query.lines?.length) {
      const error = pricingInvalidQueryError('At least one pricing line is required');
      return this.handlePresentationFailure(method, error, query.tenantId);
    }

    const telemetry = createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    markPricingLoading({ operation: 'validatePricing', query }, createAttemptId());

    const sdkResult = this.deps.sdk.validatePricing(buildValidatePricingInput(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    if (!sdkResult.value.valid) {
      markPricingEmpty(sdkResult.value);
      telemetry.success(query.tenantId, 'empty');
      return { ok: true, value: sdkResult.value };
    }

    markPricingSuccess(sdkResult.value);
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  async getPriceList(
    query: GetPriceListFacadeQuery
  ): Promise<PricingFacadeOutcome<unknown>> {
    const method = 'getPriceList';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: pricingFeatureDisabledError() };
    }

    const telemetry = createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    markPricingLoading({ operation: 'getPriceList', query }, createAttemptId());

    return this.handlePresentationFailure(
      method,
      pricingOperationNotConfiguredError('getPriceList'),
      query.tenantId
    );
  }

  async applyCoupon(
    query: ApplyCouponFacadeQuery
  ): Promise<PricingFacadeOutcome<CouponApplication>> {
    const method = 'applyCoupon';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: pricingFeatureDisabledError() };
    }

    const telemetry = createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    markPricingLoading({ operation: 'applyCoupon', query }, createAttemptId());

    const sdkResult = await this.deps.sdk.applyCoupon(buildApplyCouponQuery(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    markPricingSuccess(sdkResult.value);
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  async getDeliveryCharge(
    query: GetDeliveryChargeFacadeQuery
  ): Promise<PricingFacadeOutcome<FeeResult>> {
    const method = 'getDeliveryCharge';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: pricingFeatureDisabledError() };
    }

    const telemetry = createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    markPricingLoading({ operation: 'getDeliveryCharge', query }, createAttemptId());

    const sdkResult = await this.deps.sdk.calculateDeliveryFee(buildDeliveryFeeQuery(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    markPricingSuccess(sdkResult.value);
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  async getPackagingCharge(
    query: GetPackagingChargeFacadeQuery
  ): Promise<PricingFacadeOutcome<FeeResult>> {
    const method = 'getPackagingCharge';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: pricingFeatureDisabledError() };
    }

    const telemetry = createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    markPricingLoading({ operation: 'getPackagingCharge', query }, createAttemptId());

    const sdkResult = await this.deps.sdk.calculatePackagingFee(buildPackagingFeeQuery(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    markPricingSuccess(sdkResult.value);
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  async retry(): Promise<PricingFacadeOutcome<unknown>> {
    const lastRequest = getLastPricingRequest();
    if (!lastRequest) {
      const error = pricingInvalidQueryError('No prior pricing request to retry');
      markPricingError(error);
      return { ok: false, error };
    }

    if (getPricingRetryCount() >= DEFAULT_MAX_RETRIES) {
      const error = pricingInvalidQueryError(
        'Maximum retry attempts reached. Please try again later.'
      );
      markPricingError(error);
      return { ok: false, error };
    }

    const lastError = getPricingSessionSnapshot().lastError;
    if (lastError && !lastError.retryable) {
      const error = pricingInvalidQueryError('Last pricing failure is not retryable');
      markPricingError(error);
      return { ok: false, error };
    }

    markPricingRetry();
    createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, 'retry').retry(
      lastRequest.query.tenantId
    );

    switch (lastRequest.operation) {
      case 'getPrice':
        return this.getPrice(lastRequest.query);
      case 'calculatePrice':
        return this.calculatePrice(lastRequest.query);
      case 'validatePricing':
        return this.validatePricing(lastRequest.query);
      case 'getPriceList':
        return this.getPriceList(lastRequest.query);
      case 'applyCoupon':
        return this.applyCoupon(lastRequest.query);
      case 'getDeliveryCharge':
        return this.getDeliveryCharge(lastRequest.query);
      case 'getPackagingCharge':
        return this.getPackagingCharge(lastRequest.query);
      default:
        return { ok: false, error: pricingInvalidQueryError('Unsupported retry operation') };
    }
  }

  resetSession(): void {
    resetPricingSession();
    createPricingFacadeTelemetryEmitter(this.deps.onTelemetry, 'resetSession').reset();
  }

  subscribeSession(listener: (snapshot: PricingSessionSnapshot) => void): () => void {
    return subscribePricingSession(listener);
  }

  getSessionSnapshot(): PricingSessionSnapshot {
    return getPricingSessionSnapshot();
  }
}

export {
  getPricingSessionSnapshot,
  subscribePricingSession,
  resetPricingSession,
  normalizePricingError,
  pricingFeatureDisabledError,
};

export type {
  GetPriceFacadeQuery,
  CalculatePriceFacadeQuery,
  ValidatePricingFacadeQuery,
  GetPriceListFacadeQuery,
  ApplyCouponFacadeQuery,
  GetDeliveryChargeFacadeQuery,
  GetPackagingChargeFacadeQuery,
  PricingFacadeOutcome,
  PricingSessionSnapshot,
};

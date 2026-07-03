/**
 * PricingSDK — error mapping between domain, repository, and SDK (M8 PR-4).
 */

import type { SdkFailure, SdkResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';
import type { PricingDomainError } from '../../../domain/pricing/shared/PricingDomainResult';
import { PRICING_ERROR_MESSAGES } from '../errors/pricingErrors';

const KNOWN_CODES = new Set(['NOT_FOUND', 'VALIDATION', 'NOT_CONFIGURED', 'UNAVAILABLE']);

export const mapDomainErrorToSdk = (error: PricingDomainError): SdkFailure =>
  sdkFail(
    sdkError('VALIDATION', error.message, {
      pricingCode: error.code,
      field: error.field,
    })
  );

export const mapRepositoryResultToSdk = <T>(result: SdkResult<T>): SdkResult<T> => {
  if (result.ok) {
    return result;
  }

  const code = KNOWN_CODES.has(result.error.code) ? result.error.code : 'UNAVAILABLE';

  return sdkFail(
    sdkError(code, result.error.message, {
      ...result.error.details,
      pricingCode: result.error.details?.pricingCode ?? result.error.code,
      provider: result.error.details?.provider ?? 'PricingRepository',
    })
  );
};

export const repositoryUnavailable = (method: string): SdkFailure =>
  sdkFail(
    sdkError('UNAVAILABLE', PRICING_ERROR_MESSAGES.NOT_CONFIGURED, {
      pricingCode: 'REPOSITORY_UNAVAILABLE',
      method,
    })
  );

export const pricingNotFound = (entity: string, id: string): SdkFailure =>
  sdkFail(
    sdkError('NOT_FOUND', `${entity} not found`, {
      pricingCode: 'NOT_FOUND',
      entity,
      id,
    })
  );

export const mapUnknownErrorToSdk = (message: string): SdkFailure =>
  sdkFail(
    sdkError('UNAVAILABLE', message, {
      pricingCode: 'UNKNOWN',
    })
  );

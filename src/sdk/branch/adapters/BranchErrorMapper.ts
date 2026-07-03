/**
 * BranchSDK — error mapping between domain, repository, and SDK (M5 PR-4).
 */

import type { SdkErrorCode, SdkFailure, SdkResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';
import type { BranchDomainError, BranchDomainResult } from '../../../domain/branch/shared/BranchErrors';
import { BRANCH_ERROR_MESSAGES } from '../errors/branchErrors';

const DOMAIN_TO_SDK_CODE: Record<string, SdkErrorCode> = {
  INVALID_QUERY: 'VALIDATION',
  INVALID_WEIGHTS: 'VALIDATION',
  NO_ELIGIBLE_BRANCH: 'VALIDATION',
  VALIDATION_FAILED: 'VALIDATION',
};

export const mapDomainErrorToSdk = (error: BranchDomainError): SdkFailure =>
  sdkFail(
    sdkError(DOMAIN_TO_SDK_CODE[error.code] ?? 'VALIDATION', error.message, {
      branchCode: error.code,
      field: error.field,
    })
  );

export const mapDomainResultToSdk = <T>(
  result: BranchDomainResult<T>
): SdkResult<T> => (result.ok ? result : mapDomainErrorToSdk(result.error));

export const mapRepositoryResultToSdk = <T>(
  result: SdkResult<T>
): SdkResult<T> => {
  if (result.ok) {
    return result;
  }

  const branchCode =
    typeof result.error.details?.branchCode === 'string'
      ? result.error.details.branchCode
      : result.error.code;

  return sdkFail(
    sdkError(result.error.code, result.error.message, {
      ...result.error.details,
      branchCode,
      provider: result.error.details?.provider ?? 'BranchRepository',
    })
  );
};

export const repositoryUnavailable = (method: string): SdkFailure =>
  sdkFail(
    sdkError('UNAVAILABLE', BRANCH_ERROR_MESSAGES.REPOSITORY_UNAVAILABLE, {
      branchCode: 'REPOSITORY_UNAVAILABLE',
      method,
    })
  );

export const branchNotFound = (entity: string, id: string): SdkFailure =>
  sdkFail(
    sdkError('NOT_FOUND', `${entity} not found`, {
      branchCode: 'NOT_FOUND',
      id,
    })
  );

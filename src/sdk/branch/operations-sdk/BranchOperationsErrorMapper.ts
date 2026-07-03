/**
 * BranchSDK — operations error mapping (M5 PR-12).
 */

import type { SdkResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';
import { BRANCH_ERROR_MESSAGES } from '../errors/branchErrors';

const LAYER = 'BranchOperationsSDK';

export const mapOperationsRepositoryResultToSdk = <T>(result: SdkResult<T>): SdkResult<T> =>
  result;

export const operationsRepositoryUnavailable = (method: string) =>
  sdkFail(
    sdkError('UNAVAILABLE', BRANCH_ERROR_MESSAGES.REPOSITORY_UNAVAILABLE, {
      branchCode: 'REPOSITORY_UNAVAILABLE',
      provider: LAYER,
      method,
    })
  );

export const operationsInvalidQueryError = (message: string) =>
  sdkFail(
    sdkError('VALIDATION', message, {
      branchCode: 'VALIDATION',
      provider: LAYER,
    })
  );

export { branchNotConfiguredAsync } from '../adapters/notConfigured';

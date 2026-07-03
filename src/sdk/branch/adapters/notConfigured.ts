/**
 * BranchSDK — NOT_CONFIGURED helpers for stub adapter paths (M5 PR-1).
 */

import type { SdkAsyncResult, SdkFailure, SdkResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';

export const branchNotConfigured = (method: string, layer: string): SdkFailure =>
  sdkFail(
    sdkError('NOT_CONFIGURED', `${method} is not configured on ${layer}`, {
      branchCode: 'NOT_CONFIGURED',
      provider: layer,
    })
  );

export const branchNotConfiguredAsync = <T>(
  method: string,
  layer: string
): SdkAsyncResult<T> => Promise.resolve(branchNotConfigured(method, layer) as SdkResult<T>);

export const branchNotConfiguredSync = <T>(method: string, layer: string): SdkResult<T> =>
  branchNotConfigured(method, layer) as SdkResult<T>;

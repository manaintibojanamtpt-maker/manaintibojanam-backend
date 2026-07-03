/**
 * SearchSDK — NOT_CONFIGURED helpers for stub adapter paths (M4 PR-1).
 */

import type { SdkAsyncResult, SdkFailure, SdkResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';

export const searchNotConfigured = (method: string, layer: string): SdkFailure =>
  sdkFail(
    sdkError('NOT_CONFIGURED', `${method} is not configured on ${layer}`, {
      searchCode: 'NOT_CONFIGURED',
      provider: layer,
    })
  );

export const searchNotConfiguredAsync = <T>(
  method: string,
  layer: string
): SdkAsyncResult<T> => Promise.resolve(searchNotConfigured(method, layer) as SdkResult<T>);

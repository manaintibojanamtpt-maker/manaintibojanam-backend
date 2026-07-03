/**
 * LocationSDK — NOT_CONFIGURED helpers for stub adapter paths (M2 PR-6).
 */

import type { SdkAsyncResult, SdkFailure, SdkResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';

export const locationNotConfigured = (method: string, layer: string): SdkFailure => {
  return sdkFail(
    sdkError('NOT_CONFIGURED', `${method} is not configured on ${layer}`, {
      locationCode: 'NOT_CONFIGURED',
      provider: layer,
    })
  );
};

export const locationNotConfiguredAsync = <T>(
  method: string,
  layer: string
): SdkAsyncResult<T> => Promise.resolve(locationNotConfigured(method, layer) as SdkResult<T>);

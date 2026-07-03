/**
 * DiscoverySDK — NOT_CONFIGURED helpers for stub adapter paths (M3 PR-2).
 */

import type { SdkAsyncResult, SdkFailure, SdkResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';

export const discoveryNotConfigured = (method: string, layer: string): SdkFailure =>
  sdkFail(
    sdkError('NOT_CONFIGURED', `${method} is not configured on ${layer}`, {
      discoveryCode: 'NOT_CONFIGURED',
      provider: layer,
    })
  );

export const discoveryNotConfiguredAsync = <T>(
  method: string,
  layer: string
): SdkAsyncResult<T> => Promise.resolve(discoveryNotConfigured(method, layer) as SdkResult<T>);

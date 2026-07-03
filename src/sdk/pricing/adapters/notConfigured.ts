/**
 * PricingSDK — NOT_CONFIGURED helpers (M8 PR-1).
 */

import type { SdkAsyncResult, SdkFailure, SdkResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';

export const pricingNotConfigured = (method: string, layer: string): SdkFailure =>
  sdkFail(
    sdkError('NOT_CONFIGURED', `${method} is not configured on ${layer}`, {
      pricingCode: 'NOT_CONFIGURED',
      provider: layer,
    })
  );

export const pricingNotConfiguredAsync = <T>(
  method: string,
  layer: string
): SdkAsyncResult<T> => Promise.resolve(pricingNotConfigured(method, layer) as SdkResult<T>);

export const pricingNotConfiguredSync = <T>(
  method: string,
  layer: string
): SdkResult<T> => pricingNotConfigured(method, layer) as SdkResult<T>;

/**
 * MenuSDK — NOT_CONFIGURED helpers (M7 PR-1).
 */

import type { SdkAsyncResult, SdkFailure, SdkResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';

export const menuNotConfigured = (method: string, layer: string): SdkFailure =>
  sdkFail(
    sdkError('NOT_CONFIGURED', `${method} is not configured on ${layer}`, {
      menuCode: 'NOT_CONFIGURED',
      provider: layer,
    })
  );

export const menuNotConfiguredAsync = <T>(
  method: string,
  layer: string
): SdkAsyncResult<T> => Promise.resolve(menuNotConfigured(method, layer) as SdkResult<T>);

export const menuNotConfiguredSync = <T>(
  method: string,
  layer: string
): SdkResult<T> => menuNotConfigured(method, layer) as SdkResult<T>;

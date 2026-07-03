/**
 * EventSDK — NOT_CONFIGURED helpers for stub adapter paths (M6 PR-1).
 */

import type { SdkAsyncResult, SdkFailure, SdkResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';

export const eventNotConfigured = (method: string, layer: string): SdkFailure =>
  sdkFail(
    sdkError('NOT_CONFIGURED', `${method} is not configured on ${layer}`, {
      eventCode: 'NOT_CONFIGURED',
      provider: layer,
    })
  );

export const eventNotConfiguredAsync = <T>(
  method: string,
  layer: string
): SdkAsyncResult<T> => Promise.resolve(eventNotConfigured(method, layer) as SdkResult<T>);

export const eventReplayDisabledAsync = <T>(method: string): SdkAsyncResult<T> =>
  Promise.resolve(
    sdkFail(
      sdkError('REPLAY_DISABLED', `${method} is disabled — FF_EVENT_REPLAY_ENABLED is off`, {
        eventCode: 'REPLAY_DISABLED',
      })
    ) as SdkResult<T>
  );

export const eventOutboxDisabledAsync = <T>(method: string): SdkAsyncResult<T> =>
  Promise.resolve(
    sdkFail(
      sdkError('OUTBOX_UNAVAILABLE', `${method} is disabled — FF_EVENT_OUTBOX_ENABLED is off`, {
        eventCode: 'OUTBOX_UNAVAILABLE',
      })
    ) as SdkResult<T>
  );

export const eventProjectionDisabledAsync = <T>(method: string): SdkAsyncResult<T> =>
  Promise.resolve(
    sdkFail(
      sdkError('NOT_CONFIGURED', `${method} is disabled — FF_EVENT_PROJECTION_ENABLED is off`, {
        eventCode: 'PROJECTION_DISABLED',
      })
    ) as SdkResult<T>
  );

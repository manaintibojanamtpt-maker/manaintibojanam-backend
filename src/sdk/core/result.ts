/**
 * BhojanOS SDK — result type for explicit success/failure (no exceptions at boundary).
 */

import type { SdkError } from './errors';

export type SdkSuccess<T> = {
  readonly ok: true;
  readonly value: T;
};

export type SdkFailure = {
  readonly ok: false;
  readonly error: SdkError;
};

export type SdkResult<T> = SdkSuccess<T> | SdkFailure;

export type SdkAsyncResult<T> = Promise<SdkResult<T>>;

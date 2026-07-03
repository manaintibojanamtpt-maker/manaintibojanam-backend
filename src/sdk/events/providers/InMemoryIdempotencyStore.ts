/**
 * EventSDK — in-memory idempotency store (M6 PR-1 dev/test only).
 */

import type { IdempotencyStorePort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class InMemoryIdempotencyStore implements IdempotencyStorePort {
  private readonly keys = new Map<string, string>();

  has(key: string): SdkAsyncResult<boolean> {
    return Promise.resolve(sdkOk(this.keys.has(key)));
  }

  mark(key: string, eventId: string): SdkAsyncResult<void> {
    this.keys.set(key, eventId);
    return Promise.resolve(sdkOk(undefined));
  }
}

export function createInMemoryIdempotencyStore(): IdempotencyStorePort {
  return new InMemoryIdempotencyStore();
}

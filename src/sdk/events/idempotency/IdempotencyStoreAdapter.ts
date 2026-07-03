/**
 * Wraps PR-1 IdempotencyStorePort as IdempotencyRepositoryPort (backward compat).
 */

import type { IdempotencyStorePort } from '../contracts/ports';
import type { IdempotencyRepositoryPort } from '../contracts/infrastructurePorts';
import type { IdempotencyKey } from '../dto/IdempotencyKey';
import type { IdempotencyRecord } from '../dto/IdempotencyRecord';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import { asEventId } from '../types/branded';

export class IdempotencyStoreAdapter implements IdempotencyRepositoryPort {
  constructor(private readonly store: IdempotencyStorePort) {}

  async has(key: IdempotencyKey): SdkAsyncResult<boolean> {
    return this.store.has(key);
  }

  async get(key: IdempotencyKey): SdkAsyncResult<IdempotencyRecord | null> {
    const exists = await this.store.has(key);
    if (!exists.ok) return exists;
    if (!exists.value) return sdkOk(null);
    return sdkOk({
      key,
      eventId: asEventId('unknown'),
      recordedAt: new Date().toISOString(),
    });
  }

  async put(record: IdempotencyRecord): SdkAsyncResult<void> {
    return this.store.mark(record.key, record.eventId);
  }

  purgeExpired(_now: string): SdkAsyncResult<number> {
    return Promise.resolve(sdkOk(0));
  }
}

export function adaptIdempotencyStore(store: IdempotencyStorePort): IdempotencyRepositoryPort {
  return new IdempotencyStoreAdapter(store);
}

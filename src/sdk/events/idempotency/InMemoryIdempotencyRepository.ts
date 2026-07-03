/**
 * EventSDK — in-memory idempotency repository (M6 PR-2 test only).
 */

import type { IdempotencyRepositoryPort } from '../contracts/infrastructurePorts';
import type { IdempotencyRecord } from '../dto/IdempotencyRecord';
import type { IdempotencyKey } from '../dto/IdempotencyKey';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class InMemoryIdempotencyRepository implements IdempotencyRepositoryPort {
  private readonly records = new Map<string, IdempotencyRecord>();

  has(key: IdempotencyKey): SdkAsyncResult<boolean> {
    const record = this.records.get(key);
    if (!record) return Promise.resolve(sdkOk(false));
    if (record.expiresAt && record.expiresAt < new Date().toISOString()) {
      this.records.delete(key);
      return Promise.resolve(sdkOk(false));
    }
    return Promise.resolve(sdkOk(true));
  }

  get(key: IdempotencyKey): SdkAsyncResult<IdempotencyRecord | null> {
    const record = this.records.get(key);
    if (!record) return Promise.resolve(sdkOk(null));
    if (record.expiresAt && record.expiresAt < new Date().toISOString()) {
      this.records.delete(key);
      return Promise.resolve(sdkOk(null));
    }
    return Promise.resolve(sdkOk(record));
  }

  put(record: IdempotencyRecord): SdkAsyncResult<void> {
    this.records.set(record.key, record);
    return Promise.resolve(sdkOk(undefined));
  }

  purgeExpired(now: string): SdkAsyncResult<number> {
    let purged = 0;
    for (const [key, record] of this.records.entries()) {
      if (record.expiresAt && record.expiresAt < now) {
        this.records.delete(key);
        purged += 1;
      }
    }
    return Promise.resolve(sdkOk(purged));
  }

  size(): number {
    return this.records.size;
  }
}

export function createInMemoryIdempotencyRepository(): IdempotencyRepositoryPort {
  return new InMemoryIdempotencyRepository();
}

/** Default TTL: 24 hours */
export const DEFAULT_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export function computeIdempotencyExpiry(recordedAt: string, ttlMs = DEFAULT_IDEMPOTENCY_TTL_MS): string {
  return new Date(new Date(recordedAt).getTime() + ttlMs).toISOString();
}

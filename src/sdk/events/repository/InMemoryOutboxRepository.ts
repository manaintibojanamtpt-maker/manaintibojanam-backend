/**
 * EventSDK — in-memory outbox repository (M6 PR-1 dev/test only).
 */

import type { OutboxRepositoryPort } from '../contracts/ports';
import type { OutboxRecord } from '../dto/OutboxRecord';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import { asOutboxId } from '../types/branded';
import type { UuidPort } from '../contracts/ports';

export class InMemoryOutboxRepository implements OutboxRepositoryPort {
  private readonly records: OutboxRecord[] = [];

  constructor(private readonly uuid: UuidPort) {}

  append<TPayload>(
    record: Omit<OutboxRecord<TPayload>, 'outboxId' | 'createdAt'>
  ): SdkAsyncResult<OutboxRecord<TPayload>> {
    const entry: OutboxRecord<TPayload> = {
      ...record,
      outboxId: asOutboxId(this.uuid.generate()),
      createdAt: new Date().toISOString(),
    };
    this.records.push(entry);
    return Promise.resolve(sdkOk(entry));
  }

  markPublished(outboxId: string, publishedAt: string): SdkAsyncResult<void> {
    const record = this.records.find((r) => r.outboxId === outboxId);
    if (record) {
      (record as { status: string }).status = 'published';
      (record as { publishedAt?: string }).publishedAt = publishedAt;
    }
    return Promise.resolve(sdkOk(undefined));
  }

  markFailed(outboxId: string, error: string): SdkAsyncResult<void> {
    const record = this.records.find((r) => r.outboxId === outboxId);
    if (record) {
      (record as { status: string }).status = 'failed';
      (record as { lastError?: string }).lastError = error;
      (record as { attemptCount: number }).attemptCount += 1;
    }
    return Promise.resolve(sdkOk(undefined));
  }

  fetchPending(limit: number): SdkAsyncResult<OutboxRecord[]> {
    return this.listPending(limit);
  }

  listPending(limit: number): SdkAsyncResult<OutboxRecord[]> {
    const pending = this.records.filter((r) => r.status === 'pending').slice(0, limit);
    return Promise.resolve(sdkOk(pending));
  }

  /** Test helper — expose record count. */
  size(): number {
    return this.records.length;
  }
}

export function createInMemoryOutboxRepository(uuid: UuidPort): OutboxRepositoryPort {
  return new InMemoryOutboxRepository(uuid);
}

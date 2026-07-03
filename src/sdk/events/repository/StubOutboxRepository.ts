/**
 * EventSDK — stub outbox repository (M6 PR-1).
 */

import type { OutboxRepositoryPort } from '../contracts/ports';
import type { OutboxRecord } from '../dto/OutboxRecord';
import type { SdkAsyncResult } from '../../core/result';
import { eventNotConfiguredAsync } from '../adapters/notConfigured';

const LAYER = 'StubOutboxRepository';

export class StubOutboxRepository implements OutboxRepositoryPort {
  append<TPayload>(
    _record: Omit<OutboxRecord<TPayload>, 'outboxId' | 'createdAt'>
  ): SdkAsyncResult<OutboxRecord<TPayload>> {
    return eventNotConfiguredAsync('append', LAYER);
  }

  markPublished(_outboxId: string, _publishedAt: string): SdkAsyncResult<void> {
    return eventNotConfiguredAsync('markPublished', LAYER);
  }

  markFailed(_outboxId: string, _error: string): SdkAsyncResult<void> {
    return eventNotConfiguredAsync('markFailed', LAYER);
  }

  fetchPending(_limit: number): SdkAsyncResult<OutboxRecord[]> {
    return eventNotConfiguredAsync('fetchPending', LAYER);
  }

  listPending(_limit: number): SdkAsyncResult<OutboxRecord[]> {
    return eventNotConfiguredAsync('listPending', LAYER);
  }
}

export function createStubOutboxRepository(): OutboxRepositoryPort {
  return new StubOutboxRepository();
}

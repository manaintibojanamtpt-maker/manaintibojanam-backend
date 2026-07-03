/**
 * EventSDK — in-memory dead-letter repository (M6 PR-2 test only).
 */

import type { DeadLetterRepositoryPort } from '../contracts/infrastructurePorts';
import type { DeadLetterRecord } from '../dto/DeadLetterRecord';
import type { DeadLetterMetadata } from '../dto/DeadLetterMetadata';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class InMemoryDeadLetterRepository implements DeadLetterRepositoryPort {
  private readonly records: DeadLetterRecord[] = [];

  append<TPayload>(
    entry: Omit<DeadLetterRecord<TPayload>, 'deadLetterId' | 'failedAt'> & {
      metadata?: DeadLetterMetadata;
    }
  ): SdkAsyncResult<DeadLetterRecord<TPayload>> {
    const record: DeadLetterRecord<TPayload> = {
      ...entry,
      deadLetterId: `dlq-${this.records.length + 1}`,
      failedAt: new Date().toISOString(),
    };
    this.records.push(record);
    return Promise.resolve(sdkOk(record));
  }

  list(consumerGroup: string, limit: number): SdkAsyncResult<DeadLetterRecord[]> {
    const filtered = this.records
      .filter((r) => r.consumerGroup === consumerGroup)
      .slice(0, limit);
    return Promise.resolve(sdkOk(filtered));
  }

  size(): number {
    return this.records.length;
  }
}

export function createInMemoryDeadLetterRepository(): DeadLetterRepositoryPort {
  return new InMemoryDeadLetterRepository();
}

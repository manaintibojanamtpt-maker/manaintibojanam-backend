/**
 * EventSDK — in-memory dead-letter port (M6 PR-4 test only).
 * Implements DeadLetterPort.record (PR-1 contract).
 */

import type { DeadLetterPort } from '../contracts/ports';
import type { DeadLetterRecord } from '../dto/DeadLetterRecord';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class InMemoryDeadLetterPort implements DeadLetterPort {
  private readonly records: DeadLetterRecord[] = [];

  record<TPayload>(
    entry: Omit<DeadLetterRecord<TPayload>, 'deadLetterId' | 'failedAt'>
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
    return Promise.resolve(
      sdkOk(this.records.filter((r) => r.consumerGroup === consumerGroup).slice(0, limit))
    );
  }

  size(): number {
    return this.records.length;
  }
}

export function createInMemoryDeadLetterPort(): DeadLetterPort {
  return new InMemoryDeadLetterPort();
}

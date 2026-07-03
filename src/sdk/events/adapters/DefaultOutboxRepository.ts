/**
 * EventSDK — default outbox repository (M6 PR-2 infrastructure).
 */

import type { ExtendedOutboxRepositoryPort } from '../contracts/infrastructurePorts';
import type { OutboxRepositoryPort } from '../contracts/ports';
import type { OutboxRecord } from '../dto/OutboxRecord';
import type { ClockPort, UuidPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import { asOutboxId } from '../types/branded';
import type { EventInfrastructureTelemetryHook } from '../telemetry/EventInfrastructureTelemetry';
import { createEventInfrastructureTelemetryEmitter } from '../telemetry/EventInfrastructureTelemetry';

export class DefaultOutboxRepository implements ExtendedOutboxRepositoryPort, OutboxRepositoryPort {
  private readonly records: OutboxRecord[] = [];

  constructor(
    private readonly uuid: UuidPort,
    private readonly clock: ClockPort,
    private readonly onTelemetry?: EventInfrastructureTelemetryHook
  ) {}

  append<TPayload>(
    record: Omit<OutboxRecord<TPayload>, 'outboxId' | 'createdAt'>
  ): SdkAsyncResult<OutboxRecord<TPayload>> {
    const telemetry = createEventInfrastructureTelemetryEmitter(this.onTelemetry, 'append');
    const entry: OutboxRecord<TPayload> = {
      ...record,
      outboxId: asOutboxId(this.uuid.generate()),
      createdAt: this.clock.now(),
    };
    this.records.push(entry);
    telemetry.outboxAppend(entry.eventId, entry.type);
    return Promise.resolve(sdkOk(entry));
  }

  listPending(limit: number): SdkAsyncResult<OutboxRecord[]> {
    const pending = this.records.filter((r) => r.status === 'pending').slice(0, limit);
    return Promise.resolve(sdkOk(pending));
  }

  fetchPending(limit: number): SdkAsyncResult<OutboxRecord[]> {
    return this.listPending(limit);
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

  size(): number {
    return this.records.length;
  }
}

export interface CreateDefaultOutboxRepositoryOptions {
  readonly uuid: UuidPort;
  readonly clock: ClockPort;
  readonly onTelemetry?: EventInfrastructureTelemetryHook;
}

export function createDefaultOutboxRepository(
  options: CreateDefaultOutboxRepositoryOptions
): ExtendedOutboxRepositoryPort {
  return new DefaultOutboxRepository(options.uuid, options.clock, options.onTelemetry);
}

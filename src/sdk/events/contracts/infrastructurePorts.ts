/**
 * EventSDK — extended ports (M6 PR-2 infrastructure).
 * Additive extensions to PR-1 ports — no breaking changes.
 */

import type { EventEnvelope } from '../dto/EventEnvelope';
import type { PublishResult } from '../dto/PublishResult';
import type { SubscribeResult } from '../dto/SubscribeResult';
import type { Subscription } from '../dto/Subscription';
import type { ReplayRequest } from '../dto/ReplayRequest';
import type { ReplayResult } from '../dto/ReplayResult';
import type {
  ReplayRangeRequest,
  ReplayByAggregateRequest,
  ReplayByTypeRequest,
} from '../dto/ReplayRangeRequest';
import type { OutboxRecord } from '../dto/OutboxRecord';
import type { EventCursor } from '../dto/EventCursor';
import type { DeadLetterRecord } from '../dto/DeadLetterRecord';
import type { DeadLetterMetadata } from '../dto/DeadLetterMetadata';
import type { IdempotencyRecord } from '../dto/IdempotencyRecord';
import type { IdempotencyKey } from '../dto/IdempotencyKey';
import type { EventTypeName, SchemaVersion, AggregateId } from '../types/branded';
import type { EventVersion } from '../dto/EventVersion';
import type { SdkAsyncResult } from '../../core/result';

export type {
  EventPublisherPort,
  EventHandler,
  EventSubscriberPort,
  OutboxRepositoryPort,
  EventSchemaDefinition,
  SchemaRegistryPort,
  EventStorePort,
  ReplayPort,
  ClockPort,
  UuidPort,
  IdempotencyStorePort,
  DeadLetterPort,
} from './ports';

/** Idempotency repository with TTL abstraction (no persistence in PR-2). */
export interface IdempotencyRepositoryPort {
  has(key: IdempotencyKey): SdkAsyncResult<boolean>;
  get(key: IdempotencyKey): SdkAsyncResult<IdempotencyRecord | null>;
  put(record: IdempotencyRecord): SdkAsyncResult<void>;
  purgeExpired(now: string): SdkAsyncResult<number>;
}

/** Dead-letter repository — no queue implementation in PR-2. */
export interface DeadLetterRepositoryPort {
  append<TPayload>(
    entry: Omit<DeadLetterRecord<TPayload>, 'deadLetterId' | 'failedAt'> & {
      metadata?: DeadLetterMetadata;
    }
  ): SdkAsyncResult<DeadLetterRecord<TPayload>>;
  list(consumerGroup: string, limit: number): SdkAsyncResult<DeadLetterRecord[]>;
}

/** Extended replay service (M6 PR-2). */
export interface ReplayServicePort {
  replay(request: ReplayRequest): SdkAsyncResult<ReplayResult>;
  replayRange(request: ReplayRangeRequest): SdkAsyncResult<ReplayResult>;
  replayByAggregate(request: ReplayByAggregateRequest): SdkAsyncResult<ReplayResult>;
  replayByType(request: ReplayByTypeRequest): SdkAsyncResult<ReplayResult>;
}

/** Extended event store with aggregate/type queries (M6 PR-2). */
export interface ExtendedEventStorePort {
  append<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<void>;
  read(fromCursor: EventCursor, limit: number): SdkAsyncResult<EventEnvelope[]>;
  readByAggregate(
    aggregateType: string,
    aggregateId: AggregateId,
    limit: number
  ): SdkAsyncResult<EventEnvelope[]>;
  readByType(type: EventTypeName, limit: number): SdkAsyncResult<EventEnvelope[]>;
}

/** Extended outbox repository (M6 PR-2). */
export interface ExtendedOutboxRepositoryPort {
  append<TPayload>(
    record: Omit<OutboxRecord<TPayload>, 'outboxId' | 'createdAt'>
  ): SdkAsyncResult<OutboxRecord<TPayload>>;
  listPending(limit: number): SdkAsyncResult<OutboxRecord[]>;
  markPublished(outboxId: string, publishedAt: string): SdkAsyncResult<void>;
  markFailed(outboxId: string, error: string): SdkAsyncResult<void>;
}

/** Extended schema registry with compatibility validation (M6 PR-2). */
export interface ExtendedSchemaRegistryPort {
  register(
    definition: Omit<import('./ports').EventSchemaDefinition, 'registeredAt'>
  ): SdkAsyncResult<import('./ports').EventSchemaDefinition>;
  resolve(
    type: EventTypeName,
    version: EventVersion
  ): SdkAsyncResult<import('./ports').EventSchemaDefinition | null>;
  list(type: EventTypeName): SdkAsyncResult<import('./ports').EventSchemaDefinition[]>;
  validateCompatibility(
    type: EventTypeName,
    version: EventVersion,
    schemaVersion: SchemaVersion
  ): SdkAsyncResult<boolean>;
}

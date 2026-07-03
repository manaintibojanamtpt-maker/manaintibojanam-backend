import type { EventEnvelope } from '../dto/EventEnvelope';
import type { PublishResult } from '../dto/PublishResult';
import type { SubscribeResult } from '../dto/SubscribeResult';
import type { Subscription } from '../dto/Subscription';
import type { ReplayRequest } from '../dto/ReplayRequest';
import type { ReplayResult } from '../dto/ReplayResult';
import type { OutboxRecord } from '../dto/OutboxRecord';
import type { EventCursor } from '../dto/EventCursor';
import type { DeadLetterRecord } from '../dto/DeadLetterRecord';
import type { EventTypeName, SchemaVersion } from '../types/branded';
import type { EventVersion } from '../dto/EventVersion';
import type { SdkAsyncResult } from '../../core/result';

/** Provider-neutral publish port. */
export interface EventPublisherPort {
  publish<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<PublishResult>;
}

export type EventHandler<TPayload = unknown> = (
  envelope: EventEnvelope<TPayload>
) => SdkAsyncResult<void>;

/** Provider-neutral subscribe port. */
export interface EventSubscriberPort {
  subscribe<TPayload>(
    subscription: Omit<Subscription, 'subscriptionId' | 'createdAt'>,
    handler: EventHandler<TPayload>
  ): SdkAsyncResult<SubscribeResult>;

  unsubscribe(subscriptionId: string): SdkAsyncResult<void>;
}

/** Durable outbox repository port. */
export interface OutboxRepositoryPort {
  append<TPayload>(record: Omit<OutboxRecord<TPayload>, 'outboxId' | 'createdAt'>): SdkAsyncResult<OutboxRecord<TPayload>>;
  markPublished(outboxId: string, publishedAt: string): SdkAsyncResult<void>;
  markFailed(outboxId: string, error: string): SdkAsyncResult<void>;
  fetchPending(limit: number): SdkAsyncResult<OutboxRecord[]>;
}

export interface EventSchemaDefinition {
  readonly type: EventTypeName;
  readonly version: EventVersion;
  readonly schemaVersion: SchemaVersion;
  readonly jsonSchema?: Readonly<Record<string, unknown>>;
  readonly registeredAt: string;
}

/** Versioned event schema registry port. */
export interface SchemaRegistryPort {
  register(definition: Omit<EventSchemaDefinition, 'registeredAt'>): SdkAsyncResult<EventSchemaDefinition>;
  resolve(type: EventTypeName, version: EventVersion): SdkAsyncResult<EventSchemaDefinition | null>;
  list(type: EventTypeName): SdkAsyncResult<EventSchemaDefinition[]>;
}

/** Append-only event store port. */
export interface EventStorePort {
  append<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<void>;
  read(fromCursor: EventCursor, limit: number): SdkAsyncResult<EventEnvelope[]>;
}

/** Replay engine port. */
export interface ReplayPort {
  replay(request: ReplayRequest): SdkAsyncResult<ReplayResult>;
}

/** Clock abstraction for deterministic tests. */
export interface ClockPort {
  now(): string;
}

/** UUID abstraction for deterministic tests. */
export interface UuidPort {
  generate(): string;
}

/** Idempotency store port — deduplicate publish/consume. */
export interface IdempotencyStorePort {
  has(key: string): SdkAsyncResult<boolean>;
  mark(key: string, eventId: string): SdkAsyncResult<void>;
}

/** Dead-letter queue port. */
export interface DeadLetterPort {
  record<TPayload>(entry: Omit<DeadLetterRecord<TPayload>, 'deadLetterId' | 'failedAt'>): SdkAsyncResult<DeadLetterRecord<TPayload>>;
  list(consumerGroup: string, limit: number): SdkAsyncResult<DeadLetterRecord[]>;
}

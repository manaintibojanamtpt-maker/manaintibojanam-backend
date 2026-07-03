/**
 * EventSDK — public contract (M6 PR-1 foundation).
 * Provider-neutral event platform — no Kafka, Pub/Sub, or RabbitMQ.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { EventEnvelope } from '../dto/EventEnvelope';
import type { PublishResult } from '../dto/PublishResult';
import type { SubscribeResult } from '../dto/SubscribeResult';
import type { Subscription } from '../dto/Subscription';
import type { ReplayRequest } from '../dto/ReplayRequest';
import type { ReplayResult } from '../dto/ReplayResult';
import type { EventSchemaDefinition } from './ports';
import type { EventTypeName } from '../types/branded';
import type { EventVersion } from '../dto/EventVersion';
import type { CreateEventSDKOptions } from '../shared/options';

export type EventHandler<TPayload = unknown> = (
  envelope: EventEnvelope<TPayload>
) => SdkAsyncResult<void>;

export interface EventSDK {
  /** Publish an EventEnvelope — never raw JSON. */
  publish<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<PublishResult>;

  /** Register a consumer subscription. */
  subscribe<TPayload>(
    subscription: Omit<Subscription, 'subscriptionId' | 'createdAt'>,
    handler: EventHandler<TPayload>
  ): SdkAsyncResult<SubscribeResult>;

  /** Register a versioned event schema. */
  registerSchema(
    definition: Omit<EventSchemaDefinition, 'registeredAt'>
  ): SdkAsyncResult<EventSchemaDefinition>;

  /** Resolve schema for type + version. */
  resolveSchema(
    type: EventTypeName,
    version: EventVersion
  ): SdkAsyncResult<EventSchemaDefinition | null>;

  /** Replay events for a consumer group (admin/rebuild). */
  replay(request: ReplayRequest): SdkAsyncResult<ReplayResult>;
}

export interface EventSDKFactory {
  createEventSDK(options?: CreateEventSDKOptions): EventSDK;
}

export type { CreateEventSDKOptions };

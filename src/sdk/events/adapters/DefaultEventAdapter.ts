/**
 * EventSDK — default adapter (M6 PR-2).
 * Composes infrastructure via EventInfrastructureFactory.
 */

import type { EventSDK, EventHandler } from '../contracts/EventSDK';
import type { EventEnvelope } from '../dto/EventEnvelope';
import type { PublishResult } from '../dto/PublishResult';
import type { SubscribeResult } from '../dto/SubscribeResult';
import type { Subscription } from '../dto/Subscription';
import type { ReplayRequest } from '../dto/ReplayRequest';
import type { ReplayResult } from '../dto/ReplayResult';
import type { EventSchemaDefinition } from '../contracts/ports';
import type { EventTypeName } from '../types/branded';
import type { EventVersion } from '../dto/EventVersion';
import type { SdkAsyncResult } from '../../core/result';
import type { CreateEventSDKOptions } from '../shared/options';
import { createEventInfrastructure } from './EventInfrastructureFactory';

export class DefaultEventAdapter implements EventSDK {
  constructor(
    private readonly infra: ReturnType<typeof createEventInfrastructure>
  ) {}

  publish<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<PublishResult> {
    return this.infra.publisher.publish(envelope);
  }

  subscribe<TPayload>(
    subscription: Omit<Subscription, 'subscriptionId' | 'createdAt'>,
    handler: EventHandler<TPayload>
  ): SdkAsyncResult<SubscribeResult> {
    return this.infra.subscriber.subscribe(subscription, handler);
  }

  registerSchema(
    definition: Omit<EventSchemaDefinition, 'registeredAt'>
  ): SdkAsyncResult<EventSchemaDefinition> {
    return this.infra.schemaRegistry.register(definition);
  }

  resolveSchema(
    type: EventTypeName,
    version: EventVersion
  ): SdkAsyncResult<EventSchemaDefinition | null> {
    return this.infra.schemaRegistry.resolve(type, version);
  }

  replay(request: ReplayRequest): SdkAsyncResult<ReplayResult> {
    return this.infra.replayService.replay(request);
  }
}

export function createDefaultEventAdapter(options: CreateEventSDKOptions = {}): EventSDK {
  const infra = createEventInfrastructure({
    featureFlags: options.featureFlags,
    clock: options.clock,
    uuid: options.uuid,
    onTelemetry: options.onTelemetry,
    outboxRepository: options.outboxRepository as import('../contracts/infrastructurePorts').ExtendedOutboxRepositoryPort | undefined,
    eventStore: options.eventStore as import('../contracts/infrastructurePorts').ExtendedEventStorePort | undefined,
    schemaRegistry: options.schemaRegistry as import('../contracts/infrastructurePorts').ExtendedSchemaRegistryPort | undefined,
    idempotencyRepository: options.idempotencyRepository,
    deadLetterRepository: options.deadLetterRepository,
  });

  if (options.publisher) {
    return new DefaultEventAdapter({
      ...infra,
      publisher: options.publisher,
      subscriber: options.subscriber ?? infra.subscriber,
    });
  }

  if (options.subscriber) {
    return new DefaultEventAdapter({
      ...infra,
      subscriber: options.subscriber,
    });
  }

  if (options.replayEngine) {
    return new DefaultEventAdapter({
      ...infra,
      replayService: options.replayEngine as import('../contracts/infrastructurePorts').ReplayServicePort,
    });
  }

  return new DefaultEventAdapter(infra);
}

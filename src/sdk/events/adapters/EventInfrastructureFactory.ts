/**
 * EventSDK — infrastructure factory (M6 PR-2).
 * Composes all Default* infrastructure adapters.
 */

import type { EventPublisherPort } from '../contracts/ports';
import type { EventSubscriberPort } from '../contracts/ports';
import type { ReplayPort } from '../contracts/ports';
import type {
  ExtendedEventStorePort,
  ExtendedOutboxRepositoryPort,
  ExtendedSchemaRegistryPort,
  ReplayServicePort,
  IdempotencyRepositoryPort,
  DeadLetterRepositoryPort,
} from '../contracts/infrastructurePorts';
import type { ClockPort, UuidPort } from '../contracts/ports';
import type { EventFeatureFlagReader } from '../core/featureFlags';
import { readEventFlagDefault } from '../core/featureFlags';
import type { EventInfrastructureTelemetryHook } from '../telemetry/EventInfrastructureTelemetry';
import { createDefaultEventPublisher } from './DefaultEventPublisher';
import { createDefaultEventSubscriber } from './DefaultEventSubscriber';
import { createDefaultOutboxRepository } from './DefaultOutboxRepository';
import { createDefaultEventStore } from './DefaultEventStore';
import { createDefaultSchemaRegistry } from './DefaultSchemaRegistry';
import { createDefaultReplayService } from './DefaultReplayService';
import { createDefaultClock } from '../providers/DefaultClock';
import { createDefaultUuid } from '../providers/DefaultUuid';
import { createInMemoryIdempotencyRepository } from '../idempotency/InMemoryIdempotencyRepository';
import { createInMemoryDeadLetterRepository } from '../deadletter/InMemoryDeadLetterRepository';
import { createStubEventPublisher } from '../providers/StubEventPublisher';
import { createStubEventSubscriber } from '../providers/StubEventSubscriber';
import { createStubOutboxRepository } from '../repository/StubOutboxRepository';

export interface EventInfrastructure {
  readonly publisher: EventPublisherPort;
  readonly subscriber: EventSubscriberPort;
  readonly outboxRepository: ExtendedOutboxRepositoryPort;
  readonly eventStore: ExtendedEventStorePort;
  readonly schemaRegistry: ExtendedSchemaRegistryPort;
  readonly replayService: ReplayServicePort;
  readonly idempotencyRepository: IdempotencyRepositoryPort;
  readonly deadLetterRepository: DeadLetterRepositoryPort;
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
}

export interface CreateEventInfrastructureOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly onTelemetry?: EventInfrastructureTelemetryHook;
  readonly outboxRepository?: ExtendedOutboxRepositoryPort;
  readonly eventStore?: ExtendedEventStorePort;
  readonly schemaRegistry?: ExtendedSchemaRegistryPort;
  readonly idempotencyRepository?: IdempotencyRepositoryPort;
  readonly deadLetterRepository?: DeadLetterRepositoryPort;
}

export function createEventInfrastructure(
  options: CreateEventInfrastructureOptions = {}
): EventInfrastructure {
  const readFlag = options.featureFlags ?? readEventFlagDefault;
  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();

  if (!readFlag('FF_EVENT_PLATFORM_ENABLED')) {
    return {
      publisher: createStubEventPublisher(),
      subscriber: createStubEventSubscriber(),
      outboxRepository: createStubOutboxRepository() as ExtendedOutboxRepositoryPort,
      eventStore: createDefaultEventStore(),
      schemaRegistry: createDefaultSchemaRegistry(clock),
      replayService: createDefaultReplayService({
        featureFlags: readFlag,
        eventStore: createDefaultEventStore(),
        clock,
      }),
      idempotencyRepository: createInMemoryIdempotencyRepository(),
      deadLetterRepository: createInMemoryDeadLetterRepository(),
      clock,
      uuid,
    };
  }

  const eventStore = options.eventStore ?? createDefaultEventStore();
  const schemaRegistry = options.schemaRegistry ?? createDefaultSchemaRegistry(clock);
  const idempotencyRepository =
    options.idempotencyRepository ?? createInMemoryIdempotencyRepository();
  const deadLetterRepository =
    options.deadLetterRepository ?? createInMemoryDeadLetterRepository();

  const outboxRepository =
    options.outboxRepository ??
    createDefaultOutboxRepository({ uuid, clock, onTelemetry: options.onTelemetry });

  const replayService = createDefaultReplayService({
    featureFlags: readFlag,
    eventStore,
    clock,
    onTelemetry: options.onTelemetry,
  });

  const publisher = createDefaultEventPublisher({
    featureFlags: readFlag,
    outboxRepository,
    eventStore,
    schemaRegistry,
    idempotencyRepository,
    clock,
    uuid,
    onTelemetry: options.onTelemetry,
  });

  const subscriber = createDefaultEventSubscriber({
    featureFlags: readFlag,
    uuid,
    clock,
    deadLetterRepository,
    replayService,
    onTelemetry: options.onTelemetry,
  });

  return {
    publisher,
    subscriber,
    outboxRepository,
    eventStore,
    schemaRegistry,
    replayService,
    idempotencyRepository,
    deadLetterRepository,
    clock,
    uuid,
  };
}

export function createEventStore(
  options: { eventStore?: ExtendedEventStorePort } = {}
): ExtendedEventStorePort {
  return options.eventStore ?? createDefaultEventStore();
}

export function createSchemaRegistry(
  options: { clock?: ClockPort; schemaRegistry?: ExtendedSchemaRegistryPort } = {}
): ExtendedSchemaRegistryPort {
  const clock = options.clock ?? createDefaultClock();
  return options.schemaRegistry ?? createDefaultSchemaRegistry(clock);
}

export function createOutboxRepository(
  options: CreateEventInfrastructureOptions = {}
): ExtendedOutboxRepositoryPort {
  const readFlag = options.featureFlags ?? readEventFlagDefault;

  if (
    options.outboxRepository ||
    (!readFlag('FF_EVENT_PLATFORM_ENABLED') || !readFlag('FF_EVENT_OUTBOX_ENABLED'))
  ) {
    if (options.outboxRepository) return options.outboxRepository;
    return createStubOutboxRepository() as ExtendedOutboxRepositoryPort;
  }

  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();
  return createDefaultOutboxRepository({ uuid, clock, onTelemetry: options.onTelemetry });
}

export function createReplayService(
  options: CreateEventInfrastructureOptions & { eventStore?: ExtendedEventStorePort } = {}
): ReplayServicePort {
  const readFlag = options.featureFlags ?? readEventFlagDefault;
  const clock = options.clock ?? createDefaultClock();
  const eventStore = options.eventStore ?? createDefaultEventStore();

  return createDefaultReplayService({
    featureFlags: readFlag,
    eventStore,
    clock,
    onTelemetry: options.onTelemetry,
  });
}

/** Backward-compatible alias — ReplayPort is subset of ReplayServicePort */
export function createReplayEngine(
  options: CreateEventInfrastructureOptions & { eventStore?: ExtendedEventStorePort } = {}
): ReplayPort {
  return createReplayService(options);
}

export {
  createDefaultEventPublisher as createEventPublisher,
  createDefaultEventSubscriber as createEventSubscriber,
};

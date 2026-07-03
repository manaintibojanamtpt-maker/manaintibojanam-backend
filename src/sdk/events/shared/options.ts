import type {
  ClockPort,
  DeadLetterPort,
  EventPublisherPort,
  EventStorePort,
  EventSubscriberPort,
  IdempotencyStorePort,
  OutboxRepositoryPort,
  ReplayPort,
  SchemaRegistryPort,
  UuidPort,
} from '../contracts/ports';
import type {
  DeadLetterRepositoryPort,
  IdempotencyRepositoryPort,
  ReplayServicePort,
} from '../contracts/infrastructurePorts';
import type { EventFeatureFlagReader } from '../core/featureFlags';
import type { EventSDK } from '../contracts/EventSDK';
import type { EventInfrastructureTelemetryHook } from '../telemetry/EventInfrastructureTelemetry';

export interface CreateEventSDKOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly eventSdk?: EventSDK;
  readonly publisher?: EventPublisherPort;
  readonly subscriber?: EventSubscriberPort;
  readonly outboxRepository?: OutboxRepositoryPort;
  readonly schemaRegistry?: SchemaRegistryPort;
  readonly eventStore?: EventStorePort;
  readonly replayEngine?: ReplayPort | ReplayServicePort;
  readonly idempotencyStore?: IdempotencyStorePort;
  readonly idempotencyRepository?: IdempotencyRepositoryPort;
  readonly deadLetterPort?: DeadLetterPort;
  readonly deadLetterRepository?: DeadLetterRepositoryPort;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly onTelemetry?: EventInfrastructureTelemetryHook;
}

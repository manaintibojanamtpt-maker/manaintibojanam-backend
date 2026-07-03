/**
 * EventSDK — default publisher (M6 PR-2 infrastructure).
 * Validates envelope, schema, assigns IDs, writes to outbox + event store.
 */

import type { EventPublisherPort } from '../contracts/ports';
import type { ClockPort, UuidPort } from '../contracts/ports';
import type {
  ExtendedEventStorePort,
  ExtendedOutboxRepositoryPort,
  ExtendedSchemaRegistryPort,
  IdempotencyRepositoryPort,
} from '../contracts/infrastructurePorts';
import type { EventEnvelope } from '../dto/EventEnvelope';
import type { PublishResult } from '../dto/PublishResult';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import { validateEventEnvelope } from '../validation/validateEventEnvelope';
import { validateRequiredMetadata } from '../validation/validateRequiredMetadata';
import { validateAggregateConsistency } from '../validation/validateAggregateConsistency';
import { validateVersionCompatibility } from '../validation/validateVersionCompatibility';
import { enrichEventEnvelope } from '../validation/enrichEventEnvelope';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../core/featureFlags';
import { eventOutboxDisabledAsync } from './notConfigured';
import { createStubEventPublisher } from '../providers/StubEventPublisher';
import type { EventInfrastructureTelemetryHook } from '../telemetry/EventInfrastructureTelemetry';
import { createEventInfrastructureTelemetryEmitter } from '../telemetry/EventInfrastructureTelemetry';
import { asIdempotencyKey } from '../dto/IdempotencyKey';
import {
  computeIdempotencyExpiry,
  DEFAULT_IDEMPOTENCY_TTL_MS,
} from '../idempotency/InMemoryIdempotencyRepository';
import type { IdempotencyStorePort } from '../contracts/ports';
import { adaptIdempotencyStore } from '../idempotency/IdempotencyStoreAdapter';
import { asSchemaVersion } from '../types/branded';
import { createDefaultClock } from '../providers/DefaultClock';
import { createDefaultUuid } from '../providers/DefaultUuid';
import { createDefaultSchemaRegistry } from './DefaultSchemaRegistry';

export interface CreateDefaultEventPublisherOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly outboxRepository?: ExtendedOutboxRepositoryPort;
  readonly eventStore?: ExtendedEventStorePort;
  readonly schemaRegistry?: ExtendedSchemaRegistryPort;
  readonly idempotencyRepository?: IdempotencyRepositoryPort;
  /** @deprecated PR-1 compat — use idempotencyRepository */
  readonly idempotencyStore?: IdempotencyStorePort;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly onTelemetry?: EventInfrastructureTelemetryHook;
  readonly enrichMissingFields?: boolean;
}

export class DefaultEventPublisher implements EventPublisherPort {
  constructor(
    private readonly options: Required<
      Pick<
        CreateDefaultEventPublisherOptions,
        | 'outboxRepository'
        | 'eventStore'
        | 'schemaRegistry'
        | 'idempotencyRepository'
        | 'clock'
        | 'uuid'
      >
    > & {
      featureFlags: EventFeatureFlagReader;
      onTelemetry?: EventInfrastructureTelemetryHook;
      enrichMissingFields: boolean;
    }
  ) {}

  async publish<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<PublishResult> {
    const readFlag = this.options.featureFlags;
    const telemetry = createEventInfrastructureTelemetryEmitter(
      this.options.onTelemetry,
      'publish',
      envelope.metadata?.correlationId
    );

    if (!readFlag('FF_EVENT_OUTBOX_ENABLED')) {
      return eventOutboxDisabledAsync('publish');
    }

    telemetry.publishStarted(envelope.header?.type, envelope.header?.eventId);

    let prepared = envelope;
    if (this.options.enrichMissingFields) {
      prepared = enrichEventEnvelope(
        envelope as Parameters<typeof enrichEventEnvelope>[0],
        { clock: this.options.clock, uuid: this.options.uuid }
      );
    }

    const validations = [
      validateEventEnvelope(prepared),
      validateRequiredMetadata(prepared),
      validateAggregateConsistency(prepared),
    ];
    for (const v of validations) {
      if (!v.ok) {
        telemetry.publishFailed(v.error.code, prepared.header?.type);
        return v;
      }
    }

    const schemaResult = await this.options.schemaRegistry.resolve(
      prepared.header.type,
      prepared.header.version
    );
    if (!schemaResult.ok) {
      telemetry.publishFailed(schemaResult.error.code, prepared.header.type);
      return schemaResult;
    }

    if (schemaResult.value) {
      const versionCheck = validateVersionCompatibility(
        prepared.header.version,
        schemaResult.value.version
      );
      if (!versionCheck.ok) {
        telemetry.publishFailed(versionCheck.error.code, prepared.header.type);
        return versionCheck;
      }

      const compat = await this.options.schemaRegistry.validateCompatibility(
        prepared.header.type,
        prepared.header.version,
        asSchemaVersion(schemaResult.value.schemaVersion)
      );
      if (!compat.ok) {
        telemetry.publishFailed(compat.error.code, prepared.header.type);
        return compat;
      }
    }

    const idempotencyKey = prepared.metadata.idempotencyKey;
    if (idempotencyKey) {
      const key = asIdempotencyKey(idempotencyKey);
      const exists = await this.options.idempotencyRepository.has(key);
      if (!exists.ok) {
        telemetry.publishFailed(exists.error.code, prepared.header.type);
        return exists;
      }
      if (exists.value) {
        telemetry.publishCompleted(prepared.header.eventId, prepared.header.type);
        return sdkOk({
          eventId: prepared.header.eventId,
          publishedAt: this.options.clock.now(),
          duplicate: true,
        });
      }
    }

    const outboxResult = await this.options.outboxRepository.append({
      eventId: prepared.header.eventId,
      type: prepared.header.type,
      version: prepared.header.version,
      envelope: prepared,
      status: 'pending',
      attemptCount: 0,
    });
    if (!outboxResult.ok) {
      telemetry.publishFailed(outboxResult.error.code, prepared.header.type);
      return outboxResult;
    }

    const storeResult = await this.options.eventStore.append(prepared);
    if (!storeResult.ok) {
      telemetry.publishFailed(storeResult.error.code, prepared.header.type);
      return storeResult;
    }

    const publishedAt = this.options.clock.now();
    await this.options.outboxRepository.markPublished(outboxResult.value.outboxId, publishedAt);

    if (idempotencyKey) {
      const recordedAt = this.options.clock.now();
      await this.options.idempotencyRepository.put({
        key: asIdempotencyKey(idempotencyKey),
        eventId: prepared.header.eventId,
        recordedAt,
        expiresAt: computeIdempotencyExpiry(recordedAt, DEFAULT_IDEMPOTENCY_TTL_MS),
      });
    }

    telemetry.publishCompleted(prepared.header.eventId, prepared.header.type);
    return sdkOk({
      eventId: prepared.header.eventId,
      outboxId: outboxResult.value.outboxId,
      publishedAt,
    });
  }
}

export function createDefaultEventPublisher(
  options: CreateDefaultEventPublisherOptions = {}
): EventPublisherPort {
  const readFlag = options.featureFlags ?? readEventFlagDefault;

  if (!readFlag('FF_EVENT_PLATFORM_ENABLED')) {
    return createStubEventPublisher();
  }

  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();
  const schemaRegistry = options.schemaRegistry ?? createDefaultSchemaRegistry(clock);

  const idempotencyRepository =
    options.idempotencyRepository ??
    (options.idempotencyStore ? adaptIdempotencyStore(options.idempotencyStore) : undefined);

  if (!options.outboxRepository || !options.eventStore || !idempotencyRepository) {
    return createStubEventPublisher();
  }

  return new DefaultEventPublisher({
    featureFlags: readFlag,
    outboxRepository: options.outboxRepository,
    eventStore: options.eventStore,
    schemaRegistry,
    idempotencyRepository,
    clock,
    uuid,
    onTelemetry: options.onTelemetry,
    enrichMissingFields: options.enrichMissingFields ?? true,
  });
}

/** PR-1 factory alias */
export const createEventPublisher = createDefaultEventPublisher;

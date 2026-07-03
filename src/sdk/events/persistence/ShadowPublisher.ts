/**
 * EventSDK — shadow publisher (M6 PR-3).
 * Write-only: persists EventEnvelope to outbox only.
 * Does NOT dispatch, subscribe, or invoke projection workers.
 */

import type { EventPublisherPort } from '../contracts/ports';
import type { OutboxRepositoryPort, IdempotencyStorePort, ClockPort, UuidPort } from '../contracts/ports';
import type { EventEnvelope, DomainEvent } from '../dto/EventEnvelope';
import type { PublishResult } from '../dto/PublishResult';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import { validateEventEnvelope } from '../validation/validateEventEnvelope';
import { validateRequiredMetadata } from '../validation/validateRequiredMetadata';
import { validateAggregateConsistency } from '../validation/validateAggregateConsistency';
import { enrichEventEnvelope } from '../validation/enrichEventEnvelope';
import { mapEnvelopeToOutboxAppend } from './mappers/outboxMapper';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../core/featureFlags';
import { eventNotConfiguredAsync } from '../adapters/notConfigured';
import type { EventPersistenceTelemetryHook } from './PersistenceTelemetry';
import { createPersistenceTelemetryEmitter } from './PersistenceTelemetry';

export interface ShadowPublisherOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly outboxRepository: OutboxRepositoryPort;
  readonly idempotencyStore?: IdempotencyStorePort;
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
  readonly onTelemetry?: EventPersistenceTelemetryHook;
  readonly enrichMissingFields?: boolean;
}

export class ShadowPublisher implements EventPublisherPort {
  constructor(private readonly options: ShadowPublisherOptions) {}

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readEventFlagDefault;
    return (
      readFlag('FF_EVENT_PLATFORM_ENABLED') &&
      readFlag('FF_EVENT_OUTBOX_ENABLED') &&
      readFlag('FF_EVENT_SHADOW_PUBLISHING_ENABLED')
    );
  }

  async publish<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<PublishResult> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('shadowPublish', 'ShadowPublisher');
    }

    const telemetry = createPersistenceTelemetryEmitter(
      this.options.onTelemetry,
      'shadowPublish',
      envelope.metadata?.correlationId
    );

    let prepared = envelope;
    if (this.options.enrichMissingFields ?? true) {
      prepared = enrichEventEnvelope(
        envelope as Parameters<typeof enrichEventEnvelope>[0],
        { clock: this.options.clock, uuid: this.options.uuid }
      );
    }

    for (const validation of [
      validateEventEnvelope(prepared),
      validateRequiredMetadata(prepared),
      validateAggregateConsistency(prepared),
    ]) {
      if (!validation.ok) {
        telemetry.persistFailed(validation.error.code);
        return validation;
      }
    }

    telemetry.shadowPublish(prepared.header.eventId, prepared.header.type);

    const idempotencyKey = prepared.metadata.idempotencyKey;
    if (idempotencyKey && this.options.idempotencyStore) {
      const exists = await this.options.idempotencyStore.has(idempotencyKey);
      if (!exists.ok) return exists;
      if (exists.value) {
        return sdkOk({
          eventId: prepared.header.eventId,
          publishedAt: this.options.clock.now(),
          duplicate: true,
        });
      }
    }

    const appendInput = mapEnvelopeToOutboxAppend(prepared, 'pending');
    const outboxResult = await this.options.outboxRepository.append(appendInput);
    if (!outboxResult.ok) {
      telemetry.persistFailed(outboxResult.error.code);
      return outboxResult;
    }

    telemetry.outboxWritten(prepared.header.eventId, prepared.header.type, outboxResult.value.outboxId);

    if (idempotencyKey && this.options.idempotencyStore) {
      await this.options.idempotencyStore.mark(idempotencyKey, prepared.header.eventId);
    }

    return sdkOk({
      eventId: prepared.header.eventId,
      outboxId: outboxResult.value.outboxId,
      publishedAt: this.options.clock.now(),
    });
  }

  /** Accept DomainEvent alias — same as publish */
  shadowPublish<TPayload>(event: DomainEvent<TPayload>): SdkAsyncResult<PublishResult> {
    return this.publish(event);
  }
}

export function createShadowPublisher(options: ShadowPublisherOptions): EventPublisherPort {
  return new ShadowPublisher(options);
}

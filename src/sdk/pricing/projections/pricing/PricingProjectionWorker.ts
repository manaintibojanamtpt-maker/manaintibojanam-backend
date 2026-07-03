/**
 * Pricing catalog shadow projection worker (M8 PR-7).
 * Shadow only. Mock envelopes only. No Event Platform. No PricingSDK routing.
 */

import { pricingNotConfiguredAsync } from '../../adapters/notConfigured';
import {
  readPricingFlagDefault,
  type PricingFeatureFlagReader,
} from '../../featureFlags/featureFlags';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import {
  PRICING_CATALOG_READ_PROJECTION_CONSUMER_GROUP,
  PRICING_CATALOG_READ_PROJECTION_NAME,
  PRICING_CATALOG_READ_PROJECTION_VERSION,
} from '../../../../domain/pricing/projections/pricing/PricingProjectionMetadata';
import { createPricingProjectionMapper, type PricingProjectionMapper } from './PricingProjectionMapper';
import {
  createPricingProjectionValidator,
  type PricingProjectionValidator,
} from './PricingProjectionValidator';
import type {
  PricingProjectionEnvelope,
  PricingProjectionProcessResult,
  PricingProjectionRepositoryPort,
  PricingProjectionSnapshotPort,
  PricingProjectionWorkerPort,
} from './pricingProjectionPorts';
import type { PricingCatalogProjectionTelemetryHook } from './PricingProjectionTelemetry';
import { createPricingCatalogProjectionTelemetryEmitter } from './PricingProjectionTelemetry';
import type { PricingCatalogProjectionSnapshotStore } from './PricingProjectionSnapshot';

export interface PricingProjectionWorkerOptions {
  readonly featureFlags?: PricingFeatureFlagReader;
  readonly repository: PricingProjectionRepositoryPort;
  readonly snapshotStore: PricingProjectionSnapshotPort;
  readonly mapper?: PricingProjectionMapper;
  readonly validator?: PricingProjectionValidator;
  readonly snapshotBuilder?: PricingCatalogProjectionSnapshotStore;
  readonly onTelemetry?: PricingCatalogProjectionTelemetryHook;
}

export class PricingProjectionWorker implements PricingProjectionWorkerPort {
  private readonly mapper: PricingProjectionMapper;
  private readonly validator: PricingProjectionValidator;

  constructor(private readonly options: PricingProjectionWorkerOptions) {
    this.mapper = options.mapper ?? createPricingProjectionMapper();
    this.validator = options.validator ?? createPricingProjectionValidator();
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readPricingFlagDefault;
    return readFlag('FF_PRICING_PROJECTION_ENABLED');
  }

  async process<TPayload>(
    envelope: PricingProjectionEnvelope<TPayload>
  ): SdkAsyncResult<PricingProjectionProcessResult> {
    try {
      if (!this.isEnabled()) {
        return pricingNotConfiguredAsync('process', 'PricingProjectionWorker');
      }

      const priceListId = envelope.header.aggregateId;
      const telemetry = createPricingCatalogProjectionTelemetryEmitter(
        this.options.onTelemetry,
        'process',
        priceListId
      );
      telemetry.projectionStarted(envelope.header.type, envelope.header.eventId);

      const envelopeValidation = this.validator.validateEnvelope(envelope);
      if (!envelopeValidation.ok) {
        telemetry.projectionFailed(
          envelopeValidation.error.code,
          envelope.header.type,
          envelope.header.eventId
        );
        return envelopeValidation;
      }

      const existingResult = await this.options.repository.load(priceListId);
      if (!existingResult.ok) {
        telemetry.projectionFailed(
          existingResult.error.code,
          envelope.header.type,
          envelope.header.eventId
        );
        return existingResult;
      }

      const transitionValidation = this.validator.validateTransition(
        envelope.header.type,
        existingResult.value
      );
      if (!transitionValidation.ok) {
        telemetry.projectionFailed(
          transitionValidation.error.code,
          envelope.header.type,
          envelope.header.eventId
        );
        return sdkOk({
          priceListId,
          eventType: envelope.header.type,
          eventId: envelope.header.eventId,
          applied: false,
          reason: transitionValidation.error.message,
        });
      }

      const mapped = this.mapper.mapEvent(envelope, existingResult.value);
      if (!mapped.ok) {
        telemetry.projectionFailed(mapped.error.code, envelope.header.type, envelope.header.eventId);
        return sdkOk({
          priceListId,
          eventType: envelope.header.type,
          eventId: envelope.header.eventId,
          applied: false,
          reason: mapped.error.message,
        });
      }

      const modelValidation = this.validator.validateReadModel(mapped.value);
      if (!modelValidation.ok) {
        telemetry.projectionFailed(
          modelValidation.error.code,
          envelope.header.type,
          envelope.header.eventId
        );
        return modelValidation;
      }

      const saveResult = await this.options.repository.save(mapped.value);
      if (!saveResult.ok) {
        telemetry.projectionFailed(saveResult.error.code, envelope.header.type, envelope.header.eventId);
        return saveResult;
      }

      if (this.options.snapshotBuilder) {
        const snapshot = this.options.snapshotBuilder.buildSnapshot(
          mapped.value,
          envelope.header.eventId,
          envelope.header.type
        );
        const snapshotResult = await this.options.snapshotStore.save(snapshot);
        if (!snapshotResult.ok) {
          telemetry.projectionFailed(
            snapshotResult.error.code,
            envelope.header.type,
            envelope.header.eventId
          );
          return snapshotResult;
        }
      }

      telemetry.projectionProcessed(envelope.header.type, envelope.header.eventId);
      telemetry.projectionCompleted(envelope.header.type, envelope.header.eventId);

      return sdkOk({
        priceListId,
        eventType: envelope.header.type,
        eventId: envelope.header.eventId,
        applied: true,
        readModel: mapped.value,
      });
    } catch (error) {
      return sdkOk({
        priceListId: envelope.header.aggregateId,
        eventType: envelope.header.type,
        eventId: envelope.header.eventId,
        applied: false,
        reason: error instanceof Error ? error.message : 'Unexpected projection failure',
      });
    }
  }

  static supportedEventTypes(): readonly string[] {
    return [
      'pricing.catalog.created.v1',
      'pricing.catalog.updated.v1',
      'pricing.catalog.deleted.v1',
    ];
  }

  static projectionIdentity() {
    return {
      projectionName: PRICING_CATALOG_READ_PROJECTION_NAME,
      projectionVersion: PRICING_CATALOG_READ_PROJECTION_VERSION,
      consumerGroup: PRICING_CATALOG_READ_PROJECTION_CONSUMER_GROUP,
      ownerPlatform: 'M8-PricingKernel',
      replaySupported: true,
      checkpointStrategy: 'event_id' as const,
    };
  }
}

export function createPricingProjectionWorker(
  options: PricingProjectionWorkerOptions
): PricingProjectionWorker {
  return new PricingProjectionWorker(options);
}

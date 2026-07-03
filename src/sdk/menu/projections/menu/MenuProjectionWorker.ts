/**
 * Menu catalog shadow projection worker (M7 PR-7).
 * Shadow only. Mock envelopes only. No Event Platform. No MenuSDK routing.
 */

import { menuNotConfiguredAsync } from '../../adapters/notConfigured';
import {
  readMenuFlagDefault,
  type MenuFeatureFlagReader,
} from '../../featureFlags/featureFlags';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import {
  MENU_CATALOG_READ_PROJECTION_CONSUMER_GROUP,
  MENU_CATALOG_READ_PROJECTION_NAME,
  MENU_CATALOG_READ_PROJECTION_VERSION,
} from '../../../../domain/menu/projections/menu/MenuProjectionMetadata';
import { createMenuProjectionMapper, type MenuProjectionMapper } from './MenuProjectionMapper';
import { createMenuProjectionValidator, type MenuProjectionValidator } from './MenuProjectionValidator';
import type {
  MenuProjectionEnvelope,
  MenuProjectionProcessResult,
  MenuProjectionRepositoryPort,
  MenuProjectionSnapshotPort,
  MenuProjectionWorkerPort,
} from './menuProjectionPorts';
import type { MenuCatalogProjectionTelemetryHook } from './MenuProjectionTelemetry';
import { createMenuCatalogProjectionTelemetryEmitter } from './MenuProjectionTelemetry';
import type { MenuCatalogProjectionSnapshotStore } from './MenuProjectionSnapshot';

export interface MenuProjectionWorkerOptions {
  readonly featureFlags?: MenuFeatureFlagReader;
  readonly repository: MenuProjectionRepositoryPort;
  readonly snapshotStore: MenuProjectionSnapshotPort;
  readonly mapper?: MenuProjectionMapper;
  readonly validator?: MenuProjectionValidator;
  readonly snapshotBuilder?: MenuCatalogProjectionSnapshotStore;
  readonly onTelemetry?: MenuCatalogProjectionTelemetryHook;
}

export class MenuProjectionWorker implements MenuProjectionWorkerPort {
  private readonly mapper: MenuProjectionMapper;
  private readonly validator: MenuProjectionValidator;

  constructor(private readonly options: MenuProjectionWorkerOptions) {
    this.mapper = options.mapper ?? createMenuProjectionMapper();
    this.validator = options.validator ?? createMenuProjectionValidator();
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readMenuFlagDefault;
    return readFlag('FF_MENU_PROJECTION_ENABLED');
  }

  async process<TPayload>(
    envelope: MenuProjectionEnvelope<TPayload>
  ): SdkAsyncResult<MenuProjectionProcessResult> {
    if (!this.isEnabled()) {
      return menuNotConfiguredAsync('process', 'MenuProjectionWorker');
    }

    const catalogId = envelope.header.aggregateId;
    const telemetry = createMenuCatalogProjectionTelemetryEmitter(
      this.options.onTelemetry,
      'process',
      catalogId
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

    const existingResult = await this.options.repository.get(catalogId);
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
        catalogId,
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
        catalogId,
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
      catalogId,
      eventType: envelope.header.type,
      eventId: envelope.header.eventId,
      applied: true,
      readModel: mapped.value,
    });
  }

  static supportedEventTypes(): readonly string[] {
    return [
      'menu.catalog.created.v1',
      'menu.catalog.updated.v1',
      'menu.catalog.deleted.v1',
    ];
  }

  static projectionIdentity() {
    return {
      projectionName: MENU_CATALOG_READ_PROJECTION_NAME,
      projectionVersion: MENU_CATALOG_READ_PROJECTION_VERSION,
      consumerGroup: MENU_CATALOG_READ_PROJECTION_CONSUMER_GROUP,
      ownerPlatform: 'M7-CatalogKernel',
      replaySupported: true,
      checkpointStrategy: 'event_id' as const,
    };
  }
}

export function createMenuProjectionWorker(
  options: MenuProjectionWorkerOptions
): MenuProjectionWorker {
  return new MenuProjectionWorker(options);
}

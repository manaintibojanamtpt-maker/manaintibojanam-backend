/**
 * Pricing projection coordinator (M8 PR-6).
 * Coordinates execution metadata persistence — no business mapping.
 */

import { buildPricingProjectionCheckpoint } from '../../../domain/pricing/projection/PricingProjectionCheckpoint';
import {
  completePricingProjectionExecution,
  resolvePricingProjectionFinalStatus,
  shouldPersistPricingProjectionSnapshot,
  startPricingProjectionExecution,
  type PricingProjectionExecuteRequest,
  type PricingProjectionExecuteResult,
} from '../../../domain/pricing/projection/PricingProjectionExecution';
import { buildPricingProjectionSnapshotMetadata } from '../../../domain/pricing/projection/PricingProjectionSnapshot';
import { validatePricingProjectionExecuteRequest } from '../../../domain/pricing/projection/PricingProjectionValidation';
import type { SdkAsyncResult } from '../../core/result';
import { sdkFail, sdkOk } from '../../core/resultHelpers';
import type {
  PricingProjectionCheckpointPort,
  PricingProjectionCoordinatorPort,
  PricingProjectionRepositoryPort,
  PricingProjectionSnapshotPort,
} from './PricingProjectionPorts';
import type { PricingProjectionTelemetryHook } from './PricingProjectionTelemetry';
import { createPricingProjectionTelemetryEmitter } from './PricingProjectionTelemetry';

export interface PricingProjectionCoordinatorOptions {
  readonly repository: PricingProjectionRepositoryPort;
  readonly checkpointRepository: PricingProjectionCheckpointPort;
  readonly snapshotRepository: PricingProjectionSnapshotPort;
  readonly clock?: () => string;
  readonly onTelemetry?: PricingProjectionTelemetryHook;
}

const defaultClock = (): string => new Date().toISOString();

export class PricingProjectionCoordinator implements PricingProjectionCoordinatorPort {
  constructor(private readonly options: PricingProjectionCoordinatorOptions) {}

  async coordinateExecution(
    request: PricingProjectionExecuteRequest
  ): SdkAsyncResult<PricingProjectionExecuteResult> {
    const validationErrors = validatePricingProjectionExecuteRequest(request);
    if (validationErrors.length > 0) {
      return sdkFail({
        code: 'VALIDATION',
        message: validationErrors.join('; '),
      });
    }

    const clock = this.options.clock ?? defaultClock;
    const telemetry = createPricingProjectionTelemetryEmitter(
      this.options.onTelemetry,
      'coordinateExecution',
      request.projectionName,
      request.consumerGroup
    );
    telemetry.started(request.executionId);

    const startedAt = clock();
    let execution = startPricingProjectionExecution(
      request.executionId,
      request.projectionName,
      request.consumerGroup,
      startedAt
    );

    await this.options.checkpointRepository.load(
      request.projectionName,
      request.consumerGroup
    );

    const finalStatus = resolvePricingProjectionFinalStatus(
      request.processedEvents,
      request.failedEvents
    );
    const completedAt = clock();
    execution = completePricingProjectionExecution(
      execution,
      completedAt,
      request.processedEvents,
      request.failedEvents,
      finalStatus,
      request.errors
    );

    let checkpoint = buildPricingProjectionCheckpoint({
      projectionName: request.projectionName,
      projectionVersion: request.projectionVersion,
      consumerGroup: request.consumerGroup,
      schemaVersion: request.schemaVersion,
      updatedAt: completedAt,
      eventId: request.eventId,
      sequence: request.sequence,
    });

    if (checkpoint) {
      const saveCheckpoint = await this.options.checkpointRepository.save(checkpoint);
      if (!saveCheckpoint.ok) {
        telemetry.failed(saveCheckpoint.error.code, request.executionId);
        return saveCheckpoint;
      }
      telemetry.checkpointSaved(request.executionId);
    } else {
      checkpoint = undefined;
    }

    let snapshot = undefined;
    if (shouldPersistPricingProjectionSnapshot(request.processedEvents) && checkpoint) {
      const built = buildPricingProjectionSnapshotMetadata({
        snapshotId: `${request.executionId}-snapshot`,
        projectionName: request.projectionName,
        projectionVersion: request.projectionVersion,
        checkpoint,
        capturedAt: completedAt,
        metadata: {
          consumerGroup: request.consumerGroup,
          schemaVersion: request.schemaVersion,
        },
      });

      if (built) {
        const saveSnapshot = await this.options.snapshotRepository.save(built);
        if (!saveSnapshot.ok) {
          telemetry.failed(saveSnapshot.error.code, request.executionId);
          return saveSnapshot;
        }
        snapshot = built;
        telemetry.snapshotSaved(request.executionId);
      }
    }

    const saveExecution = await this.options.repository.saveExecution(execution);
    if (!saveExecution.ok) {
      telemetry.failed(saveExecution.error.code, request.executionId);
      return saveExecution;
    }

    if (finalStatus === 'failed') {
      telemetry.failed('PROJECTION_FAILED', request.executionId);
      return sdkOk({
        executionId: request.executionId,
        status: 'failed',
        checkpoint,
        snapshot,
        execution,
      });
    }

    telemetry.completed(request.executionId);
    return sdkOk({
      executionId: request.executionId,
      status: 'completed',
      checkpoint,
      snapshot,
      execution,
    });
  }
}

export function createPricingProjectionCoordinator(
  options: PricingProjectionCoordinatorOptions
): PricingProjectionCoordinatorPort {
  return new PricingProjectionCoordinator(options);
}

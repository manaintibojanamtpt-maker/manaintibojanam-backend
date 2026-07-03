/**
 * Menu projection coordinator (M7 PR-6).
 * Coordinates execution metadata persistence — no business mapping.
 */

import { buildMenuProjectionCheckpoint } from '../../../domain/menu/projection/MenuProjectionCheckpoint';
import {
  completeMenuProjectionExecution,
  resolveMenuProjectionFinalStatus,
  shouldPersistMenuProjectionSnapshot,
  startMenuProjectionExecution,
  type MenuProjectionExecuteRequest,
  type MenuProjectionExecuteResult,
} from '../../../domain/menu/projection/MenuProjectionExecution';
import { buildMenuProjectionSnapshotMetadata } from '../../../domain/menu/projection/MenuProjectionSnapshot';
import { validateMenuProjectionExecuteRequest } from '../../../domain/menu/projection/MenuProjectionValidation';
import type { SdkAsyncResult } from '../../core/result';
import { sdkFail, sdkOk } from '../../core/resultHelpers';
import type { ClockPort } from '../../events/contracts/ports';
import { createDefaultClock } from '../../events/providers/DefaultClock';
import type {
  MenuProjectionCheckpointPort,
  MenuProjectionCoordinatorPort,
  MenuProjectionRepositoryPort,
  MenuProjectionSnapshotPort,
} from './MenuProjectionPorts';
import type { MenuProjectionTelemetryHook } from './MenuProjectionTelemetry';
import { createMenuProjectionTelemetryEmitter } from './MenuProjectionTelemetry';

export interface MenuProjectionCoordinatorOptions {
  readonly repository: MenuProjectionRepositoryPort;
  readonly checkpointRepository: MenuProjectionCheckpointPort;
  readonly snapshotRepository: MenuProjectionSnapshotPort;
  readonly clock?: ClockPort;
  readonly onTelemetry?: MenuProjectionTelemetryHook;
}

export class MenuProjectionCoordinator implements MenuProjectionCoordinatorPort {
  constructor(private readonly options: MenuProjectionCoordinatorOptions) {}

  async coordinateExecution(
    request: MenuProjectionExecuteRequest
  ): SdkAsyncResult<MenuProjectionExecuteResult> {
    const validationErrors = validateMenuProjectionExecuteRequest(request);
    if (validationErrors.length > 0) {
      return sdkFail({
        code: 'VALIDATION',
        message: validationErrors.join('; '),
      });
    }

    const clock = this.options.clock ?? createDefaultClock();
    const telemetry = createMenuProjectionTelemetryEmitter(
      this.options.onTelemetry,
      'coordinateExecution',
      request.projectionName,
      request.consumerGroup
    );
    telemetry.started(request.executionId);

    const startedAt = clock.now();
    let execution = startMenuProjectionExecution(
      request.executionId,
      request.projectionName,
      request.consumerGroup,
      startedAt
    );

    await this.options.checkpointRepository.load(
      request.projectionName,
      request.consumerGroup
    );

    const finalStatus = resolveMenuProjectionFinalStatus(
      request.processedEvents,
      request.failedEvents
    );
    const completedAt = clock.now();
    execution = completeMenuProjectionExecution(
      execution,
      completedAt,
      request.processedEvents,
      request.failedEvents,
      finalStatus
    );

    let checkpoint = buildMenuProjectionCheckpoint({
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
    if (shouldPersistMenuProjectionSnapshot(request.processedEvents) && checkpoint) {
      const built = buildMenuProjectionSnapshotMetadata({
        snapshotId: `${request.executionId}-snapshot`,
        projectionName: request.projectionName,
        projectionVersion: request.projectionVersion,
        consumerGroup: request.consumerGroup,
        schemaVersion: request.schemaVersion,
        capturedAt: completedAt,
        lastEventId: request.eventId,
        lastSequence: request.sequence,
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

export function createMenuProjectionCoordinator(
  options: MenuProjectionCoordinatorOptions
): MenuProjectionCoordinatorPort {
  return new MenuProjectionCoordinator(options);
}

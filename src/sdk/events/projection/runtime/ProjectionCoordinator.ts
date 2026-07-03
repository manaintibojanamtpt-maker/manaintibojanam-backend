/**
 * EventSDK — projection coordinator (M6 PR-6).
 * Coordinates runner execution with persistence, snapshots, history, and statistics.
 */

import type {
  ProjectionCoordinatorPort,
  ProjectionPersistencePort,
  ProjectionRuntimeExecuteRequest,
  ProjectionRuntimeExecuteResult,
} from '../../contracts/projectionRuntimePorts';
import { checkpointFromWorkerRecord } from '../../contracts/projectionRuntimePorts';
import type { ProjectionRunnerPort } from '../../contracts/projectionPorts';
import type { ClockPort } from '../../contracts/ports';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import {
  startRuntimeExecution,
  completeRuntimeExecution,
} from '../../../../domain/events/projection/runtime/ProjectionExecutionRecord';
import { buildProjectionSnapshotMetadata } from '../../../../domain/events/projection/runtime/ProjectionSnapshot';
import {
  shouldPersistSnapshot,
  shouldRecordExecutionHistory,
  resolveExecutionFinalStatus,
} from '../../../../domain/events/projection/runtime/ProjectionExecutionPolicy';
import { updateStatistics } from '../../../../domain/events/projection/runtime/ProjectionStatistics';
import { validateRuntimeExecuteInput } from '../../../../domain/events/projection/runtime/ProjectionRuntimeValidation';
import type { ProjectionRuntimeTelemetryHook } from './ProjectionRuntimeTelemetry';
import { createProjectionRuntimeTelemetryEmitter } from './ProjectionRuntimeTelemetry';

export interface ProjectionCoordinatorOptions {
  readonly runner: ProjectionRunnerPort;
  readonly persistence: ProjectionPersistencePort;
  readonly clock: ClockPort;
  readonly onTelemetry?: ProjectionRuntimeTelemetryHook;
}

export class ProjectionCoordinator implements ProjectionCoordinatorPort {
  constructor(private readonly options: ProjectionCoordinatorOptions) {}

  async coordinateExecution(
    request: ProjectionRuntimeExecuteRequest,
    executionId: string
  ): SdkAsyncResult<ProjectionRuntimeExecuteResult> {
    const validationErrors = validateRuntimeExecuteInput(request);
    if (validationErrors.length > 0) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: validationErrors.join('; ') },
      };
    }

    const telemetry = createProjectionRuntimeTelemetryEmitter(
      this.options.onTelemetry,
      'coordinateExecution',
      request.projectionName,
      request.consumerGroup
    );
    telemetry.runtimeStarted(executionId);

    const startedAt = this.options.clock.now();
    let execution = startRuntimeExecution(
      executionId,
      request.projectionName,
      request.consumerGroup,
      startedAt
    );

    await this.options.persistence.loadCheckpoint(request.projectionName, request.consumerGroup);

    const run = await this.options.runner.run({
      projectionName: request.projectionName,
      consumerGroup: request.consumerGroup,
      holderId: request.holderId,
      envelopes: request.envelopes,
    });

    if (!run.ok) {
      telemetry.runtimeFailed(run.error.code, executionId);
      return run;
    }

    const completedAt = this.options.clock.now();
    const finalStatus = resolveExecutionFinalStatus(
      run.value.processed,
      run.value.failed,
      run.value.skipped === request.envelopes.length && run.value.processed === 0
    );
    execution = completeRuntimeExecution(
      execution,
      completedAt,
      run.value.processed,
      run.value.failed,
      finalStatus
    );

    let persistedCheckpoint = undefined;
    if (run.value.checkpoint) {
      persistedCheckpoint = checkpointFromWorkerRecord(
        {
          projectionName: run.value.checkpoint.projectionName,
          projectionVersion: request.projectionVersion,
          consumerGroup: run.value.checkpoint.consumerGroup,
          eventId: run.value.checkpoint.eventId ?? run.value.checkpoint.lastEventId,
          sequence: run.value.checkpoint.sequence ?? run.value.checkpoint.lastSequence,
          schemaVersion: request.schemaVersion,
          timestamp: run.value.checkpoint.timestamp,
        },
        completedAt
      );
      await this.options.persistence.saveCheckpoint(persistedCheckpoint);
    }

    if (shouldPersistSnapshot(run.value.processed) && persistedCheckpoint) {
      const snapshot = buildProjectionSnapshotMetadata({
        snapshotId: `${executionId}-snapshot`,
        projectionName: request.projectionName,
        projectionVersion: request.projectionVersion,
        consumerGroup: request.consumerGroup,
        schemaVersion: request.schemaVersion,
        capturedAt: completedAt,
        lastEventId: persistedCheckpoint.eventId,
        lastSequence: persistedCheckpoint.sequence,
      });
      if (snapshot) {
        await this.options.persistence.saveSnapshot(snapshot);
        telemetry.snapshotSaved(executionId);
      }
    }

    if (shouldRecordExecutionHistory(execution)) {
      await this.options.persistence.appendExecution(execution);
      telemetry.executionRecorded(executionId);
    }

    const statsResult = await this.options.persistence.getStatistics(
      request.projectionName,
      request.consumerGroup
    );
    let statistics = statsResult.ok ? statsResult.value : undefined;
    if (statistics) {
      statistics = updateStatistics(statistics, {
        processed: run.value.processed,
        failed: run.value.failed,
        skipped: run.value.skipped,
        checkpointSaved: persistedCheckpoint !== undefined,
        durationMs: execution.durationMs,
      });
      await this.options.persistence.updateStatistics(
        request.projectionName,
        request.consumerGroup,
        statistics
      );
      telemetry.statisticsUpdated(executionId);
    }

    telemetry.runtimeCompleted(executionId, run.value.processed);

    return sdkOk({
      executionId,
      projectionName: request.projectionName,
      consumerGroup: request.consumerGroup,
      processed: run.value.processed,
      failed: run.value.failed,
      skipped: run.value.skipped,
      checkpoint: persistedCheckpoint,
      execution,
      statistics,
    });
  }
}

export function createProjectionCoordinator(
  options: ProjectionCoordinatorOptions
): ProjectionCoordinatorPort {
  return new ProjectionCoordinator(options);
}

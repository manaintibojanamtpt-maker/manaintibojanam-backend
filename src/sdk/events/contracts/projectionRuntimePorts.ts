/**
 * EventSDK — projection runtime ports (M6 PR-6).
 * Additive contracts — no changes to PR-4 ports.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { EventId } from '../types/branded';
import type { ProjectionSnapshotMetadata } from '../../../domain/events/projection/runtime/ProjectionSnapshot';
import type { ProjectionRuntimeExecutionRecord } from '../../../domain/events/projection/runtime/ProjectionExecutionRecord';
import type { ProjectionRuntimeStatistics } from '../../../domain/events/projection/runtime/ProjectionStatistics';
import type { PersistedProjectionCheckpoint } from '../../../domain/events/projection/runtime/ProjectionRuntimeValidation';

export interface ProjectionSnapshotRepositoryPort {
  save(snapshot: ProjectionSnapshotMetadata): SdkAsyncResult<void>;
  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionSnapshotMetadata | null>;
  list(projectionName: string, limit: number): SdkAsyncResult<ProjectionSnapshotMetadata[]>;
}

export interface ProjectionExecutionHistoryPort {
  append(record: ProjectionRuntimeExecutionRecord): SdkAsyncResult<void>;
  get(executionId: string): SdkAsyncResult<ProjectionRuntimeExecutionRecord | null>;
  listByProjection(
    projectionName: string,
    consumerGroup: string,
    limit: number
  ): SdkAsyncResult<ProjectionRuntimeExecutionRecord[]>;
  getLatestFailed(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionRuntimeExecutionRecord | null>;
}

export interface ProjectionStatisticsPort {
  get(projectionName: string, consumerGroup: string): SdkAsyncResult<ProjectionRuntimeStatistics>;
  update(
    projectionName: string,
    consumerGroup: string,
    statistics: ProjectionRuntimeStatistics
  ): SdkAsyncResult<void>;
}

export interface ProjectionPersistencePort {
  saveCheckpoint(checkpoint: PersistedProjectionCheckpoint): SdkAsyncResult<void>;
  loadCheckpoint(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<PersistedProjectionCheckpoint | null>;
  saveSnapshot(snapshot: ProjectionSnapshotMetadata): SdkAsyncResult<void>;
  loadSnapshot(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionSnapshotMetadata | null>;
  appendExecution(record: ProjectionRuntimeExecutionRecord): SdkAsyncResult<void>;
  getStatistics(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionRuntimeStatistics>;
  updateStatistics(
    projectionName: string,
    consumerGroup: string,
    statistics: ProjectionRuntimeStatistics
  ): SdkAsyncResult<void>;
}

export interface ProjectionRuntimeExecuteRequest {
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly projectionVersion: string;
  readonly schemaVersion: string;
  readonly holderId: string;
  readonly envelopes: readonly import('../dto/EventEnvelope').EventEnvelope[];
}

export interface ProjectionRuntimeExecuteResult {
  readonly executionId: string;
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly processed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly checkpoint?: PersistedProjectionCheckpoint;
  readonly execution?: ProjectionRuntimeExecutionRecord;
  readonly statistics?: ProjectionRuntimeStatistics;
}

export interface ProjectionRuntimePort {
  execute(request: ProjectionRuntimeExecuteRequest): SdkAsyncResult<ProjectionRuntimeExecuteResult>;
  getStatistics(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionRuntimeStatistics>;
  getCheckpoint(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<PersistedProjectionCheckpoint | null>;
}

export interface ProjectionCoordinatorPort {
  coordinateExecution(
    request: ProjectionRuntimeExecuteRequest,
    executionId: string
  ): SdkAsyncResult<ProjectionRuntimeExecuteResult>;
}

export interface ProjectionCheckpointPersistencePort {
  save(checkpoint: PersistedProjectionCheckpoint): SdkAsyncResult<void>;
  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<PersistedProjectionCheckpoint | null>;
}

export function checkpointFromWorkerRecord(
  record: {
    projectionName: string;
    projectionVersion: string;
    consumerGroup: string;
    eventId?: EventId;
    sequence?: number;
    schemaVersion: string;
    timestamp: string;
  },
  updatedAt: string
): PersistedProjectionCheckpoint {
  return {
    projectionName: record.projectionName,
    projectionVersion: record.projectionVersion,
    consumerGroup: record.consumerGroup,
    eventId: record.eventId,
    sequence: record.sequence,
    schemaVersion: record.schemaVersion,
    updatedAt,
  };
}

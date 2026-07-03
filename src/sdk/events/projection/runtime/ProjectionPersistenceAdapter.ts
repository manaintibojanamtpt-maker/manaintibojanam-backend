/**
 * EventSDK — projection persistence adapter (M6 PR-6).
 * Facade over checkpoint, snapshot, execution history, and statistics.
 */

import type {
  ProjectionPersistencePort,
  ProjectionCheckpointPersistencePort,
  ProjectionSnapshotRepositoryPort,
  ProjectionExecutionHistoryPort,
  ProjectionStatisticsPort,
} from '../../contracts/projectionRuntimePorts';
import type { PersistedProjectionCheckpoint } from '../../../../domain/events/projection/runtime/ProjectionRuntimeValidation';
import type { ProjectionSnapshotMetadata } from '../../../../domain/events/projection/runtime/ProjectionSnapshot';
import type { ProjectionRuntimeExecutionRecord } from '../../../../domain/events/projection/runtime/ProjectionExecutionRecord';
import type { ProjectionRuntimeStatistics } from '../../../../domain/events/projection/runtime/ProjectionStatistics';
import type { SdkAsyncResult } from '../../../core/result';

export interface ProjectionPersistenceAdapterOptions {
  readonly checkpointPersistence: ProjectionCheckpointPersistencePort;
  readonly snapshotRepository: ProjectionSnapshotRepositoryPort;
  readonly executionHistory: ProjectionExecutionHistoryPort;
  readonly statisticsStore: ProjectionStatisticsPort;
}

export class ProjectionPersistenceAdapter implements ProjectionPersistencePort {
  constructor(private readonly options: ProjectionPersistenceAdapterOptions) {}

  saveCheckpoint(checkpoint: PersistedProjectionCheckpoint): SdkAsyncResult<void> {
    return this.options.checkpointPersistence.save(checkpoint);
  }

  loadCheckpoint(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<PersistedProjectionCheckpoint | null> {
    return this.options.checkpointPersistence.load(projectionName, consumerGroup);
  }

  saveSnapshot(snapshot: ProjectionSnapshotMetadata): SdkAsyncResult<void> {
    return this.options.snapshotRepository.save(snapshot);
  }

  loadSnapshot(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionSnapshotMetadata | null> {
    return this.options.snapshotRepository.load(projectionName, consumerGroup);
  }

  appendExecution(record: ProjectionRuntimeExecutionRecord): SdkAsyncResult<void> {
    return this.options.executionHistory.append(record);
  }

  getStatistics(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionRuntimeStatistics> {
    return this.options.statisticsStore.get(projectionName, consumerGroup);
  }

  updateStatistics(
    projectionName: string,
    consumerGroup: string,
    statistics: ProjectionRuntimeStatistics
  ): SdkAsyncResult<void> {
    return this.options.statisticsStore.update(projectionName, consumerGroup, statistics);
  }
}

export function createProjectionPersistence(
  options: ProjectionPersistenceAdapterOptions
): ProjectionPersistencePort {
  return new ProjectionPersistenceAdapter(options);
}

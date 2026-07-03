/**
 * EventSDK — in-memory checkpoint repository (M6 PR-4 test only).
 */

import type {
  CheckpointRepositoryPort,
  ProjectionCheckpointRecord,
} from '../contracts/projectionPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { ProjectionTelemetryHook } from './ProjectionTelemetry';
import { createProjectionTelemetryEmitter } from './ProjectionTelemetry';

export class ProjectionCheckpointRepository implements CheckpointRepositoryPort {
  private readonly store = new Map<string, ProjectionCheckpointRecord>();

  constructor(private readonly onTelemetry?: ProjectionTelemetryHook) {}

  private key(projectionName: string, consumerGroup: string): string {
    return `${projectionName}@${consumerGroup}`;
  }

  save(checkpoint: ProjectionCheckpointRecord): SdkAsyncResult<void> {
    const telemetry = createProjectionTelemetryEmitter(
      this.onTelemetry,
      'save',
      checkpoint.projectionName,
      checkpoint.consumerGroup
    );
    this.store.set(this.key(checkpoint.projectionName, checkpoint.consumerGroup), checkpoint);
    telemetry.checkpointSaved();
    return Promise.resolve(sdkOk(undefined));
  }

  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionCheckpointRecord | null> {
    const telemetry = createProjectionTelemetryEmitter(
      this.onTelemetry,
      'load',
      projectionName,
      consumerGroup
    );
    const record = this.store.get(this.key(projectionName, consumerGroup)) ?? null;
    if (record) telemetry.checkpointLoaded();
    return Promise.resolve(sdkOk(record));
  }

  size(): number {
    return this.store.size;
  }
}

export function createProjectionCheckpointRepository(
  onTelemetry?: ProjectionTelemetryHook
): CheckpointRepositoryPort {
  return new ProjectionCheckpointRepository(onTelemetry);
}

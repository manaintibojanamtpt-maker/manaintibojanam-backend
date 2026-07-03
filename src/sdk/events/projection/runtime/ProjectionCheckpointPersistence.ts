/**
 * EventSDK — in-memory checkpoint persistence (M6 PR-6 test only).
 */

import type { ProjectionCheckpointPersistencePort } from '../../contracts/projectionRuntimePorts';
import type { PersistedProjectionCheckpoint } from '../../../../domain/events/projection/runtime/ProjectionRuntimeValidation';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class ProjectionCheckpointPersistence implements ProjectionCheckpointPersistencePort {
  private readonly store = new Map<string, PersistedProjectionCheckpoint>();

  private key(projectionName: string, consumerGroup: string): string {
    return `${projectionName}@${consumerGroup}`;
  }

  save(checkpoint: PersistedProjectionCheckpoint): SdkAsyncResult<void> {
    this.store.set(this.key(checkpoint.projectionName, checkpoint.consumerGroup), checkpoint);
    return Promise.resolve(sdkOk(undefined));
  }

  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<PersistedProjectionCheckpoint | null> {
    return Promise.resolve(sdkOk(this.store.get(this.key(projectionName, consumerGroup)) ?? null));
  }

  size(): number {
    return this.store.size;
  }
}

export function createProjectionCheckpointPersistence(): ProjectionCheckpointPersistencePort {
  return new ProjectionCheckpointPersistence();
}

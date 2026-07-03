/**
 * EventSDK — in-memory projection snapshot repository (M6 PR-6 test only).
 */

import type { ProjectionSnapshotRepositoryPort } from '../../contracts/projectionRuntimePorts';
import type { ProjectionSnapshotMetadata } from '../../../../domain/events/projection/runtime/ProjectionSnapshot';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class ProjectionSnapshotRepository implements ProjectionSnapshotRepositoryPort {
  private readonly snapshots = new Map<string, ProjectionSnapshotMetadata>();
  private readonly history: ProjectionSnapshotMetadata[] = [];

  private key(projectionName: string, consumerGroup: string): string {
    return `${projectionName}@${consumerGroup}`;
  }

  save(snapshot: ProjectionSnapshotMetadata): SdkAsyncResult<void> {
    this.snapshots.set(this.key(snapshot.projectionName, snapshot.consumerGroup), snapshot);
    this.history.push(snapshot);
    return Promise.resolve(sdkOk(undefined));
  }

  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionSnapshotMetadata | null> {
    return Promise.resolve(sdkOk(this.snapshots.get(this.key(projectionName, consumerGroup)) ?? null));
  }

  list(projectionName: string, limit: number): SdkAsyncResult<ProjectionSnapshotMetadata[]> {
    const items = this.history.filter((s) => s.projectionName === projectionName).slice(-limit);
    return Promise.resolve(sdkOk(items));
  }
}

export function createProjectionSnapshotRepository(): ProjectionSnapshotRepositoryPort {
  return new ProjectionSnapshotRepository();
}

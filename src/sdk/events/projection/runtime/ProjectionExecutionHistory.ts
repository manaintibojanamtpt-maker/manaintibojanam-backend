/**
 * EventSDK — in-memory projection execution history (M6 PR-6 test only).
 */

import type { ProjectionExecutionHistoryPort } from '../../contracts/projectionRuntimePorts';
import type { ProjectionRuntimeExecutionRecord } from '../../../../domain/events/projection/runtime/ProjectionExecutionRecord';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class ProjectionExecutionHistory implements ProjectionExecutionHistoryPort {
  private readonly records = new Map<string, ProjectionRuntimeExecutionRecord>();
  private readonly byProjection: ProjectionRuntimeExecutionRecord[] = [];

  append(record: ProjectionRuntimeExecutionRecord): SdkAsyncResult<void> {
    this.records.set(record.executionId, record);
    this.byProjection.push(record);
    return Promise.resolve(sdkOk(undefined));
  }

  get(executionId: string): SdkAsyncResult<ProjectionRuntimeExecutionRecord | null> {
    return Promise.resolve(sdkOk(this.records.get(executionId) ?? null));
  }

  listByProjection(
    projectionName: string,
    consumerGroup: string,
    limit: number
  ): SdkAsyncResult<ProjectionRuntimeExecutionRecord[]> {
    const items = this.byProjection
      .filter((r) => r.projectionName === projectionName && r.consumerGroup === consumerGroup)
      .slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  getLatestFailed(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionRuntimeExecutionRecord | null> {
    const failed = [...this.byProjection]
      .reverse()
      .find(
        (r) =>
          r.projectionName === projectionName &&
          r.consumerGroup === consumerGroup &&
          r.status === 'failed'
      );
    return Promise.resolve(sdkOk(failed ?? null));
  }
}

export function createProjectionExecutionHistory(): ProjectionExecutionHistoryPort {
  return new ProjectionExecutionHistory();
}

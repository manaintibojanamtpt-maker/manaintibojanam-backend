/**
 * EventSDK — in-memory projection statistics store (M6 PR-6 test only).
 */

import type { ProjectionStatisticsPort } from '../../contracts/projectionRuntimePorts';
import type { ProjectionRuntimeStatistics } from '../../../../domain/events/projection/runtime/ProjectionStatistics';
import { createEmptyStatistics } from '../../../../domain/events/projection/runtime/ProjectionStatistics';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class InMemoryProjectionStatisticsStore implements ProjectionStatisticsPort {
  private readonly stats = new Map<string, ProjectionRuntimeStatistics>();

  private key(projectionName: string, consumerGroup: string): string {
    return `${projectionName}@${consumerGroup}`;
  }

  get(projectionName: string, consumerGroup: string): SdkAsyncResult<ProjectionRuntimeStatistics> {
    const existing = this.stats.get(this.key(projectionName, consumerGroup));
    return Promise.resolve(
      sdkOk(existing ?? createEmptyStatistics(projectionName, consumerGroup))
    );
  }

  update(
    projectionName: string,
    consumerGroup: string,
    statistics: ProjectionRuntimeStatistics
  ): SdkAsyncResult<void> {
    this.stats.set(this.key(projectionName, consumerGroup), statistics);
    return Promise.resolve(sdkOk(undefined));
  }
}

export function createProjectionStatisticsStore(): ProjectionStatisticsPort {
  return new InMemoryProjectionStatisticsStore();
}

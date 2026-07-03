/**
 * EventSDK — in-memory projection repository (M6 PR-4 test only).
 */

import type {
  ProjectionRepositoryPort,
  ProjectionExecutionRecord,
} from '../contracts/projectionPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class InMemoryProjectionRepository implements ProjectionRepositoryPort {
  private readonly executions = new Map<string, ProjectionExecutionRecord>();

  saveExecution(execution: ProjectionExecutionRecord): SdkAsyncResult<void> {
    this.executions.set(execution.executionId, execution);
    return Promise.resolve(sdkOk(undefined));
  }

  getExecution(executionId: string): SdkAsyncResult<ProjectionExecutionRecord | null> {
    return Promise.resolve(sdkOk(this.executions.get(executionId) ?? null));
  }

  listExecutions(projectionName: string, limit: number): SdkAsyncResult<ProjectionExecutionRecord[]> {
    const items = [...this.executions.values()]
      .filter((e) => e.projectionName === projectionName)
      .slice(0, limit);
    return Promise.resolve(sdkOk(items));
  }
}

export function createInMemoryProjectionRepository(): ProjectionRepositoryPort {
  return new InMemoryProjectionRepository();
}

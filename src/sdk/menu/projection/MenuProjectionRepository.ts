/**
 * Menu projection repository (M7 PR-6).
 * Persistence abstraction for execution metadata only.
 */

import type { MenuProjectionExecutionRecord } from '../../../domain/menu/projection/MenuProjectionExecution';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { MenuProjectionRepositoryPort } from './MenuProjectionPorts';

export class MenuProjectionRepository implements MenuProjectionRepositoryPort {
  private readonly executions = new Map<string, MenuProjectionExecutionRecord>();
  private readonly history: MenuProjectionExecutionRecord[] = [];

  saveExecution(record: MenuProjectionExecutionRecord): SdkAsyncResult<void> {
    this.executions.set(record.executionId, record);
    this.history.push(record);
    return Promise.resolve(sdkOk(undefined));
  }

  getExecution(executionId: string): SdkAsyncResult<MenuProjectionExecutionRecord | null> {
    return Promise.resolve(sdkOk(this.executions.get(executionId) ?? null));
  }

  listExecutions(
    projectionName: string,
    limit: number
  ): SdkAsyncResult<MenuProjectionExecutionRecord[]> {
    const items = this.history
      .filter((record) => record.projectionName === projectionName)
      .slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  size(): number {
    return this.executions.size;
  }
}

export function createMenuProjectionRepository(
  injected?: MenuProjectionRepositoryPort
): MenuProjectionRepositoryPort {
  return injected ?? new MenuProjectionRepository();
}

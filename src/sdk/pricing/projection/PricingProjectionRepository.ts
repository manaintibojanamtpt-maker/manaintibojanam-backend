/**
 * Pricing projection repository (M8 PR-6).
 * In-memory persistence for execution metadata only.
 */

import type { PricingProjectionExecutionRecord } from '../../../domain/pricing/projection/PricingProjectionExecution';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { PricingProjectionRepositoryPort } from './PricingProjectionPorts';

export class PricingProjectionRepository implements PricingProjectionRepositoryPort {
  private readonly executions = new Map<string, PricingProjectionExecutionRecord>();
  private readonly history: PricingProjectionExecutionRecord[] = [];

  saveExecution(record: PricingProjectionExecutionRecord): SdkAsyncResult<void> {
    this.executions.set(record.executionId, record);
    this.history.push(record);
    return Promise.resolve(sdkOk(undefined));
  }

  getExecution(executionId: string): SdkAsyncResult<PricingProjectionExecutionRecord | null> {
    return Promise.resolve(sdkOk(this.executions.get(executionId) ?? null));
  }

  listExecutions(
    projectionName: string,
    limit: number
  ): SdkAsyncResult<PricingProjectionExecutionRecord[]> {
    const items = this.history
      .filter((record) => record.projectionName === projectionName)
      .slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  size(): number {
    return this.executions.size;
  }
}

export function createPricingProjectionRepository(
  injected?: PricingProjectionRepositoryPort
): PricingProjectionRepositoryPort {
  return injected ?? new PricingProjectionRepository();
}

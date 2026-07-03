/**
 * BranchSDK — default operations adapter (M5 PR-12).
 */

import type { SdkAsyncResult } from '../../core/result';
import type {
  BranchOperationsAvailabilityDto,
  BranchOperationsAvailabilityQuery,
} from '../dto/operations';
import type { BranchId } from '../types/branded';
import type { BranchOperationalSnapshotDto } from '../operations/BranchOperationsRepository';
import type { BranchOperationsRepository } from '../operations/BranchOperationsRepository';
import type { BranchOperationsSDK } from './contracts/BranchOperationsSDK';
import {
  orchestrateGetOperationalAvailability,
  orchestrateGetOperationalSnapshot,
  type BranchOperationsOrchestratorDeps,
} from './BranchOperationsOrchestrator';
import type { BranchOperationsTelemetryHook } from './BranchOperationsTelemetry';
import type { BranchOperationsEvaluatorFn } from './createBranchOperationsSdk.options';

export interface DefaultBranchOperationsAdapterDeps {
  readonly repository: BranchOperationsRepository;
  readonly repositoryEnabled: boolean;
  readonly onTelemetry?: BranchOperationsTelemetryHook;
  readonly evaluateOperations?: BranchOperationsEvaluatorFn;
}

export class DefaultBranchOperationsAdapter implements BranchOperationsSDK {
  private readonly orchestratorDeps: BranchOperationsOrchestratorDeps;

  constructor(deps: DefaultBranchOperationsAdapterDeps) {
    this.orchestratorDeps = {
      repository: deps.repository,
      repositoryEnabled: deps.repositoryEnabled,
      onTelemetry: deps.onTelemetry,
      evaluateOperations: deps.evaluateOperations,
    };
  }

  getOperationalAvailability(
    query: BranchOperationsAvailabilityQuery
  ): SdkAsyncResult<BranchOperationsAvailabilityDto> {
    return orchestrateGetOperationalAvailability(this.orchestratorDeps, query);
  }

  getOperationalSnapshot(branchId: BranchId): SdkAsyncResult<BranchOperationalSnapshotDto> {
    return orchestrateGetOperationalSnapshot(this.orchestratorDeps, branchId);
  }
}

export const createDefaultBranchOperationsAdapter = (
  deps: DefaultBranchOperationsAdapterDeps
): BranchOperationsSDK => new DefaultBranchOperationsAdapter(deps);

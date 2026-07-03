/**
 * BranchSDK — operations SDK factory options (M5 PR-12).
 */

import type { BranchOperationsAvailabilityResult } from '../../../domain/branch/operations/BranchAvailabilitySummary';
import type { BranchOperationsContext } from '../../../domain/branch/operations/BranchAvailabilitySummary';
import type { BranchOperationalSnapshot } from '../../../domain/branch/shared/BranchTypes';
import type { BranchFeatureFlagReader } from '../core/featureFlags';
import type { BranchOperationsRepository } from '../operations/BranchOperationsRepository';
import type { BranchOperationsPersistencePort } from '../operations/BranchOperationsPersistencePort';
import type { BranchOperationsSDK } from './contracts/BranchOperationsSDK';
import type { BranchOperationsTelemetryHook } from './BranchOperationsTelemetry';

export type BranchOperationsEvaluatorFn = (
  snapshot: BranchOperationalSnapshot,
  context: BranchOperationsContext
) => BranchOperationsAvailabilityResult;

export interface CreateBranchOperationsSdkOptions {
  readonly operationsSdk?: BranchOperationsSDK;
  readonly operationsRepository?: BranchOperationsRepository;
  readonly persistencePort?: BranchOperationsPersistencePort;
  readonly featureFlags?: BranchFeatureFlagReader;
  readonly onTelemetry?: BranchOperationsTelemetryHook;
  readonly evaluateOperations?: BranchOperationsEvaluatorFn;
}

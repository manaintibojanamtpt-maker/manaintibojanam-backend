/**
 * BranchSDK — factory options (M5 PR-1 / PR-4).
 */

import type { BranchOperationalSnapshot } from '../../../domain/branch/shared/BranchTypes';
import type { BranchFeatureFlagReader } from '../core/featureFlags';
import type { BranchTelemetryHook } from '../adapters/BranchTelemetry';
import type { DefaultBranchAssignmentEngine } from '../assignment/DefaultBranchAssignmentEngine';
import type { BranchAssignmentRepository } from '../repository/BranchAssignmentRepository';
import type { BranchRepository } from '../repository/BranchRepository';
import type { BranchPersistencePort } from '../repository/BranchRepositoryPorts';
import type { BranchSDK } from '../contracts/BranchSDK';
import type { BranchValidationInput } from '../dto';

export interface CreateBranchSDKOptions {
  readonly branchSdk?: BranchSDK;
  readonly branchRepository?: BranchRepository;
  readonly assignmentRepository?: BranchAssignmentRepository;
  readonly persistencePort?: BranchPersistencePort;
  readonly featureFlags?: BranchFeatureFlagReader;
  readonly onTelemetry?: BranchTelemetryHook;
  readonly assignmentEngine?: DefaultBranchAssignmentEngine | null;
  readonly syncSnapshotResolver?: (
    input: BranchValidationInput
  ) => BranchOperationalSnapshot | undefined;
}

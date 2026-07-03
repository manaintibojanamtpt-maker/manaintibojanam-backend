/**
 * BranchSDK factory — default or stub adapter by feature flag (M5 PR-4).
 */

import type { BranchSDK, BranchSDKFactory } from './contracts/BranchSDK';
import { createDefaultBranchAdapter } from './adapters/DefaultBranchAdapter';
import { createStubBranchAdapter } from './adapters/StubBranchAdapter';
import {
  readBranchFlagDefault,
  type BranchFeatureFlagReader,
} from './core/featureFlags';
import {
  createBranchRepository,
  resolveBranchRepositoryEnabled,
} from './repository/BranchRepositoryFactory';
import {
  createBranchAssignmentEngine,
  resolveBranchAssignmentEnabled,
} from './assignment/createBranchAssignmentEngine';
import type { CreateBranchSDKOptions } from './shared/options';

export function resolveBranchEnabled(options?: CreateBranchSDKOptions): boolean {
  const readFlag: BranchFeatureFlagReader = options?.featureFlags ?? readBranchFlagDefault;
  return readFlag('FF_BRANCH_ENABLED');
}

export function createBranchSDK(options: CreateBranchSDKOptions = {}): BranchSDK {
  if (options.branchSdk) {
    return options.branchSdk;
  }

  if (!resolveBranchEnabled(options)) {
    return createStubBranchAdapter();
  }

  const repository =
    options.branchRepository ??
    createBranchRepository({
      persistencePort: options.persistencePort,
      featureFlags: options.featureFlags,
    });

  const repositoryEnabled =
    resolveBranchRepositoryEnabled({
      featureFlags: options.featureFlags,
    }) || options.branchRepository !== undefined;

  const assignmentEngine =
    options.assignmentEngine ??
    createBranchAssignmentEngine({
      repository,
      repositoryEnabled,
      featureFlags: options.featureFlags,
      onTelemetry: options.onTelemetry,
    });

  return createDefaultBranchAdapter({
    repository,
    repositoryEnabled,
    assignmentEngine,
    assignmentEnabled: resolveBranchAssignmentEnabled({ featureFlags: options.featureFlags }),
    onTelemetry: options.onTelemetry,
    syncSnapshotResolver: options.syncSnapshotResolver,
  });
}

export const branchSdkFactory: BranchSDKFactory = {
  create: (options?: CreateBranchSDKOptions) => createBranchSDK(options),
};

export { StubBranchAdapter, createStubBranchAdapter } from './adapters/StubBranchAdapter';
export { DefaultBranchAdapter, createDefaultBranchAdapter } from './adapters/DefaultBranchAdapter';
export { branchNotConfigured, branchNotConfiguredAsync } from './adapters/notConfigured';

/**
 * BranchSDK — operations SDK factory (M5 PR-12).
 */

import {
  readBranchFlagDefault,
  type BranchFeatureFlagReader,
} from '../core/featureFlags';
import {
  createBranchOperationsRepository,
  resolveBranchOperationsRepositoryEnabled,
} from '../operations/BranchOperationsRepositoryFactory';
import { createDefaultBranchOperationsAdapter } from './DefaultBranchOperationsAdapter';
import { createStubBranchOperationsAdapter } from './StubBranchOperationsAdapter';
import type { BranchOperationsSDK, BranchOperationsSDKFactory } from './contracts/BranchOperationsSDK';
import type { CreateBranchOperationsSdkOptions } from './createBranchOperationsSdk.options';

export function resolveBranchOperationsSdkEnabled(
  options?: Pick<CreateBranchOperationsSdkOptions, 'featureFlags'>
): boolean {
  const readFlag: BranchFeatureFlagReader = options?.featureFlags ?? readBranchFlagDefault;
  return readFlag('FF_BRANCH_OPERATIONS_SDK_ENABLED');
}

export function createBranchOperationsSdk(
  options: CreateBranchOperationsSdkOptions = {}
): BranchOperationsSDK {
  if (options.operationsSdk) {
    return options.operationsSdk;
  }

  if (!resolveBranchOperationsSdkEnabled(options)) {
    return createStubBranchOperationsAdapter();
  }

  const repository =
    options.operationsRepository ??
    createBranchOperationsRepository({
      persistencePort: options.persistencePort,
      featureFlags: options.featureFlags,
    });

  const repositoryEnabled =
    resolveBranchOperationsRepositoryEnabled({
      featureFlags: options.featureFlags,
    }) || options.operationsRepository !== undefined;

  return createDefaultBranchOperationsAdapter({
    repository,
    repositoryEnabled,
    onTelemetry: options.onTelemetry,
    evaluateOperations: options.evaluateOperations,
  });
}

export const branchOperationsSdkFactory: BranchOperationsSDKFactory = {
  create: (options?: CreateBranchOperationsSdkOptions) => createBranchOperationsSdk(options),
};

export { createStubBranchOperationsAdapter } from './StubBranchOperationsAdapter';
export { createDefaultBranchOperationsAdapter } from './DefaultBranchOperationsAdapter';
export type { CreateBranchOperationsSdkOptions, BranchOperationsEvaluatorFn } from './createBranchOperationsSdk.options';

/**
 * BranchSDK — operations repository factory (M5 PR-11).
 */

import {
  readBranchFlagDefault,
  type BranchFeatureFlagReader,
} from '../core/featureFlags';
import { createBranchOperationsRepositoryAdapter } from './BranchOperationsRepositoryAdapter';
import type { BranchOperationsPersistencePort } from './BranchOperationsPersistencePort';
import type { BranchOperationsRepository } from './BranchOperationsRepository';
import { createStubBranchOperationsRepository } from './StubBranchOperationsRepository';

export interface CreateBranchOperationsRepositoryOptions {
  readonly persistencePort?: BranchOperationsPersistencePort;
  readonly featureFlags?: BranchFeatureFlagReader;
  readonly repository?: BranchOperationsRepository;
}

export function resolveBranchOperationsRepositoryEnabled(
  options?: CreateBranchOperationsRepositoryOptions
): boolean {
  const readFlag: BranchFeatureFlagReader = options?.featureFlags ?? readBranchFlagDefault;
  return readFlag('FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED');
}

export function createBranchOperationsRepository(
  options: CreateBranchOperationsRepositoryOptions = {}
): BranchOperationsRepository {
  if (options.repository) {
    return options.repository;
  }

  if (!resolveBranchOperationsRepositoryEnabled(options) || !options.persistencePort) {
    return createStubBranchOperationsRepository();
  }

  return createBranchOperationsRepositoryAdapter(options.persistencePort);
}

export { createStubBranchOperationsRepository } from './StubBranchOperationsRepository';

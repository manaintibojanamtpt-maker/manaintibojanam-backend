/**
 * BranchSDK — repository factory (M5 PR-3).
 */

import {
  readBranchFlagDefault,
  type BranchFeatureFlagReader,
} from '../core/featureFlags';
import type { BranchRepository } from './BranchRepository';
import { createBranchRepositoryAdapter } from './BranchRepositoryAdapter';
import type { BranchPersistencePort } from './BranchRepositoryPorts';
import { createStubBranchRepository } from './StubBranchRepository';

export interface CreateBranchRepositoryOptions {
  readonly persistencePort?: BranchPersistencePort;
  readonly featureFlags?: BranchFeatureFlagReader;
  readonly repository?: BranchRepository;
}

export function resolveBranchRepositoryEnabled(
  options?: CreateBranchRepositoryOptions
): boolean {
  const readFlag: BranchFeatureFlagReader = options?.featureFlags ?? readBranchFlagDefault;
  return readFlag('FF_BRANCH_REPOSITORY_ENABLED');
}

export function createBranchRepository(
  options: CreateBranchRepositoryOptions = {}
): BranchRepository {
  if (options.repository) {
    return options.repository;
  }

  if (!resolveBranchRepositoryEnabled(options) || !options.persistencePort) {
    return createStubBranchRepository();
  }

  return createBranchRepositoryAdapter(options.persistencePort);
}

export { createStubBranchRepository } from './StubBranchRepository';

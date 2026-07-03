/**
 * BranchSDK — assignment engine factory (M5 PR-7).
 */

import {
  readBranchFlagDefault,
  type BranchFeatureFlagReader,
} from '../core/featureFlags';
import {
  createDefaultBranchAssignmentEngine,
  type DefaultBranchAssignmentEngine,
  type DefaultBranchAssignmentEngineDeps,
} from './DefaultBranchAssignmentEngine';
import { branchNotConfiguredAsync } from '../adapters/notConfigured';

const LAYER = 'BranchAssignmentEngine';

export interface CreateBranchAssignmentEngineOptions extends DefaultBranchAssignmentEngineDeps {
  readonly featureFlags?: BranchFeatureFlagReader;
  readonly assignmentEngine?: DefaultBranchAssignmentEngine;
}

export function resolveBranchAssignmentEnabled(
  options?: Pick<CreateBranchAssignmentEngineOptions, 'featureFlags'>
): boolean {
  const readFlag: BranchFeatureFlagReader = options?.featureFlags ?? readBranchFlagDefault;
  return readFlag('FF_BRANCH_ASSIGNMENT_ENABLED');
}

export function createBranchAssignmentEngine(
  options: CreateBranchAssignmentEngineOptions
): DefaultBranchAssignmentEngine | null {
  if (options.assignmentEngine) {
    return options.assignmentEngine;
  }

  if (!resolveBranchAssignmentEnabled(options)) {
    return null;
  }

  return createDefaultBranchAssignmentEngine({
    repository: options.repository,
    repositoryEnabled: options.repositoryEnabled,
    onTelemetry: options.onTelemetry,
  });
}

export const assignmentNotConfiguredAsync = <T>() =>
  branchNotConfiguredAsync<T>('findBestBranch', LAYER);

export { createDefaultBranchAssignmentEngine } from './DefaultBranchAssignmentEngine';

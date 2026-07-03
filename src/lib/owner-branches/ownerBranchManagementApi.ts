/**
 * M5 PR-14 — injectable OwnerBranchFacade surface for UI + tests.
 */

import {
  clearOwnerBranchSession,
  estimateOwnerBranchEta,
  getOwnerBranch,
  getOwnerBranchOperationalAvailability,
  listOwnerBranches,
  retryOwnerBranch,
  subscribeOwnerBranchSession,
  type OwnerBranchFacadeDeps,
} from './OwnerBranchFacade';
import { validateOwnerBranch } from './OwnerBranchFacade';
import { isOwnerBranchEnabledDefault } from './ownerBranchFeatureFlags';
import type { OwnerBranchSessionSnapshot } from './types';

export interface OwnerBranchManagementApi {
  readonly isEnabled: () => boolean;
  readonly listBranches: typeof listOwnerBranches;
  readonly getBranch: typeof getOwnerBranch;
  readonly getOperationalAvailability: typeof getOwnerBranchOperationalAvailability;
  readonly validateBranch: typeof validateOwnerBranch;
  readonly estimateEta: typeof estimateOwnerBranchEta;
  readonly retry: typeof retryOwnerBranch;
  readonly clearSession: typeof clearOwnerBranchSession;
  readonly subscribeSession: (
    listener: (snapshot: OwnerBranchSessionSnapshot) => void
  ) => () => void;
}

export const createOwnerBranchManagementApi = (
  deps: OwnerBranchFacadeDeps = {},
  isEnabled: () => boolean = isOwnerBranchEnabledDefault
): OwnerBranchManagementApi => ({
  isEnabled,
  listBranches: (query) => listOwnerBranches(query, deps),
  getBranch: (query) => getOwnerBranch(query, deps),
  getOperationalAvailability: (query) => getOwnerBranchOperationalAvailability(query, deps),
  validateBranch: (query) => validateOwnerBranch(query, deps),
  estimateEta: (query) => estimateOwnerBranchEta(query, deps),
  retry: () => retryOwnerBranch(deps),
  clearSession: clearOwnerBranchSession,
  subscribeSession: subscribeOwnerBranchSession,
});

export const defaultOwnerBranchManagementApi = createOwnerBranchManagementApi();

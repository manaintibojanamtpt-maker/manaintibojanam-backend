/**
 * Branch domain — operations metadata and feature flag (M5 PR-10).
 */

import { BRANCH_DOMAIN_VERSION } from '../shared/BranchConstants';
import type { BranchAvailabilitySummary } from './BranchAvailabilitySummary';

export const BRANCH_OPERATIONS_FLAG = 'FF_BRANCH_OPERATIONS_ENABLED' as const;

export const BRANCH_OPERATIONS_DEFAULT_ENABLED = false;

export const BRANCH_OPERATIONS_VERSION = '0.1.0-foundation' as const;

export const BRANCH_OPERATIONS_ALGORITHM_VERSION = BRANCH_DOMAIN_VERSION;

export interface BranchOperationsMetadata {
  readonly branchId: string;
  readonly algorithmVersion: string;
  readonly operationsVersion: string;
  readonly generatedAt: number;
  readonly isOperationallyAvailable: boolean;
  readonly blockerCount: number;
}

export const isBranchOperationsEnabled = (
  override?: boolean
): boolean => override ?? BRANCH_OPERATIONS_DEFAULT_ENABLED;

export const createBranchOperationsMetadata = (
  summary: BranchAvailabilitySummary
): BranchOperationsMetadata => ({
  branchId: summary.branchId,
  algorithmVersion: BRANCH_OPERATIONS_ALGORITHM_VERSION,
  operationsVersion: BRANCH_OPERATIONS_VERSION,
  generatedAt: summary.evaluatedAt,
  isOperationallyAvailable: summary.isOperationallyAvailable,
  blockerCount: summary.blockers.length,
});

export const withOperationsTimestamp = (
  metadata: BranchOperationsMetadata,
  generatedAt: number
): BranchOperationsMetadata => ({
  ...metadata,
  generatedAt,
});

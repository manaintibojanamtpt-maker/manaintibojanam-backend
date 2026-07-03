/**
 * M5 PR-14 — owner branch management view state types.
 */

import type { BranchDetail, BranchETAEstimate, BranchValidationResult } from '../../sdk/branch/dto';
import type { BranchOperationsAvailabilityDto } from '../../sdk/branch/dto/operations';
import type { BranchSummary } from '../../sdk/branch/dto/branch';
import type { BranchId } from '../../sdk/branch/types/branded';
import type {
  OwnerBranchPresentationError,
  OwnerBranchSessionStatus,
} from '../lib/owner-branches/types';

export type OwnerBranchManagementPhase =
  | 'disabled'
  | 'loading'
  | 'empty'
  | 'ready'
  | 'error';

export interface OwnerBranchManagementViewState {
  readonly phase: OwnerBranchManagementPhase;
  readonly branches: readonly BranchSummary[];
  readonly selectedBranchId: BranchId | null;
  readonly branch: BranchDetail | null;
  readonly availability: BranchOperationsAvailabilityDto | null;
  readonly validation: BranchValidationResult | null;
  readonly estimate: BranchETAEstimate | null;
  readonly error: OwnerBranchPresentationError | null;
  readonly sessionStatus: OwnerBranchSessionStatus;
  readonly isRefreshing: boolean;
}

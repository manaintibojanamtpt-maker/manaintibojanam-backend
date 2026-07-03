/**
 * BranchSDK — assignment persistence port (M5 PR-1 foundation).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { BranchAssignment, BranchAssignmentRequest } from '../dto';
import type { BranchAssignmentId } from '../types/branded';

export interface BranchAssignmentRecord extends BranchAssignment {
  readonly draftOrderId?: string;
  readonly sessionId?: string;
  readonly supersededBy?: BranchAssignmentId;
}

export interface BranchAssignmentRepository {
  writeAssignment(request: BranchAssignmentRequest): SdkAsyncResult<BranchAssignmentRecord>;

  getAssignmentById(assignmentId: BranchAssignmentId): SdkAsyncResult<BranchAssignmentRecord>;

  supersedeAssignment(
    assignmentId: BranchAssignmentId,
    next: BranchAssignmentRequest
  ): SdkAsyncResult<BranchAssignmentRecord>;
}

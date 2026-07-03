/**
 * BranchSDK — operations persistence read port (M5 PR-11).
 * Vendor-neutral — injectable for tests and future Firestore adapters.
 * Read-only. No business logic.
 */

import type { BranchId } from '../types/branded';
import type {
  BranchCapacityDocumentRecord,
  BranchHoursDocumentRecord,
  BranchInventoryDocumentRecord,
  BranchStatusDocumentRecord,
} from '../repository/BranchPersistenceModels';

/**
 * Read-only persistence port for branch operational collections.
 * No writes. No scoring, eligibility, or assignment.
 */
export interface BranchOperationsPersistencePort {
  getBranchCapacityDocument(
    branchId: BranchId
  ): Promise<BranchCapacityDocumentRecord | null>;

  getBranchInventoryDocument(
    branchId: BranchId
  ): Promise<BranchInventoryDocumentRecord | null>;

  getBranchHoursDocument(branchId: BranchId): Promise<BranchHoursDocumentRecord | null>;

  getBranchStatusDocument(branchId: BranchId): Promise<BranchStatusDocumentRecord | null>;
}

export const createBranchOperationsPortFromBranchPort = (
  port: {
    readonly getBranchCapacityDocument: BranchOperationsPersistencePort['getBranchCapacityDocument'];
    readonly getBranchInventoryDocument: BranchOperationsPersistencePort['getBranchInventoryDocument'];
    readonly getBranchHoursDocument: BranchOperationsPersistencePort['getBranchHoursDocument'];
    readonly getBranchStatusDocument: BranchOperationsPersistencePort['getBranchStatusDocument'];
  }
): BranchOperationsPersistencePort => ({
  getBranchCapacityDocument: (branchId) => port.getBranchCapacityDocument(branchId),
  getBranchInventoryDocument: (branchId) => port.getBranchInventoryDocument(branchId),
  getBranchHoursDocument: (branchId) => port.getBranchHoursDocument(branchId),
  getBranchStatusDocument: (branchId) => port.getBranchStatusDocument(branchId),
});

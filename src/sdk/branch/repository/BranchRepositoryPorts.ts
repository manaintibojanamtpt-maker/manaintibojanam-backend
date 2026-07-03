/**
 * BranchSDK — persistence read ports (M5 PR-3).
 * Vendor-neutral — injectable for tests and future Firestore adapters.
 */

import type { TenantId } from '../../core/types';
import type { BranchId, BranchStatusValue } from '../types/branded';
import type {
  BranchCapacityDocumentRecord,
  BranchDocumentRecord,
  BranchHoursDocumentRecord,
  BranchInventoryDocumentRecord,
  BranchRoutingDocumentRecord,
  BranchStatusDocumentRecord,
} from './BranchPersistenceModels';

export interface BranchListPersistenceFilter {
  readonly tenantId: TenantId;
  readonly status?: BranchStatusValue;
  readonly includeInactive?: boolean;
  readonly limit?: number;
}

/**
 * Read-only persistence port for branch platform collections.
 * No writes. No business logic. No scoring or eligibility.
 */
export interface BranchPersistencePort {
  listBranchDocuments(
    filter: BranchListPersistenceFilter
  ): Promise<readonly BranchDocumentRecord[]>;

  getBranchDocument(branchId: BranchId): Promise<BranchDocumentRecord | null>;

  getBranchCapacityDocument(
    branchId: BranchId
  ): Promise<BranchCapacityDocumentRecord | null>;

  getBranchInventoryDocument(
    branchId: BranchId
  ): Promise<BranchInventoryDocumentRecord | null>;

  getBranchHoursDocument(branchId: BranchId): Promise<BranchHoursDocumentRecord | null>;

  getBranchStatusDocument(branchId: BranchId): Promise<BranchStatusDocumentRecord | null>;

  getBranchRoutingDocument(tenantId: TenantId): Promise<BranchRoutingDocumentRecord | null>;
}

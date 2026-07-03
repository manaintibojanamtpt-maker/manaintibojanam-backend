/**
 * BranchSDK — operations persistence → DTO mappers (M5 PR-11).
 * Pure mapping — no I/O, no business logic, no evaluation.
 */

import type { TenantId } from '../../core/types';
import type {
  BranchCapacityRecord,
  BranchHoursSnapshot,
  BranchInventorySnapshot,
  BranchStatusSnapshot,
} from '../dto';
import type { BranchId } from '../types/branded';
import type {
  BranchCapacityDocumentRecord,
  BranchHoursDocumentRecord,
  BranchInventoryDocumentRecord,
  BranchStatusDocumentRecord,
} from '../repository/BranchPersistenceModels';
import {
  mapBranchCapacityDocument,
  mapBranchHoursDocument,
  mapBranchInventoryDocument,
  mapBranchStatusDocument,
} from '../repository/BranchRepositoryMapper';
import type { BranchOperationalSnapshotDto } from './BranchOperationsRepository';

export const BRANCH_OPERATIONS_DTO_SCHEMA_VERSION = 1 as const;

export {
  mapBranchCapacityDocument,
  mapBranchHoursDocument,
  mapBranchInventoryDocument,
  mapBranchStatusDocument,
};

export const resolveOperationalCapturedAt = (
  status: BranchStatusSnapshot,
  capacity: BranchCapacityRecord,
  inventory: BranchInventorySnapshot
): number =>
  Math.max(status.updatedAt ?? 0, capacity.capturedAt ?? 0, inventory.capturedAt ?? 0);

export const mapOperationalSnapshotDto = (input: {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly status: BranchStatusSnapshot;
  readonly hours: BranchHoursSnapshot;
  readonly capacity: BranchCapacityRecord;
  readonly inventory: BranchInventorySnapshot;
}): BranchOperationalSnapshotDto => ({
  branchId: input.branchId,
  tenantId: input.tenantId,
  status: input.status,
  hours: input.hours,
  capacity: input.capacity,
  inventory: input.inventory,
  capturedAt: resolveOperationalCapturedAt(input.status, input.capacity, input.inventory),
});

export const mapOperationalDocumentsToSnapshot = (input: {
  readonly branchId: BranchId;
  readonly status: BranchStatusDocumentRecord;
  readonly hours: BranchHoursDocumentRecord;
  readonly capacity: BranchCapacityDocumentRecord;
  readonly inventory: BranchInventoryDocumentRecord;
}): BranchOperationalSnapshotDto => {
  const status = mapBranchStatusDocument(input.status);
  const hours = mapBranchHoursDocument(input.hours);
  const capacity = mapBranchCapacityDocument(input.capacity);
  const inventory = mapBranchInventoryDocument(input.inventory);

  return mapOperationalSnapshotDto({
    branchId: input.branchId,
    tenantId: input.status.tenantId as TenantId,
    status,
    hours,
    capacity,
    inventory,
  });
};

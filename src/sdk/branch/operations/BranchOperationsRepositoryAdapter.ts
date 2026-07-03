/**
 * BranchSDK — operations repository adapter (M5 PR-11).
 * Read-only — no writes, scoring, eligibility, assignment, or evaluation.
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import type {
  BranchCapacityRecord,
  BranchHoursSnapshot,
  BranchInventorySnapshot,
  BranchStatusSnapshot,
} from '../dto';
import { BRANCH_ERROR_MESSAGES } from '../errors/branchErrors';
import type { BranchId } from '../types/branded';
import {
  mapBranchCapacityDocument,
  mapBranchHoursDocument,
  mapBranchInventoryDocument,
  mapBranchStatusDocument,
  mapOperationalSnapshotDto,
} from './BranchOperationsMapper';
import type { BranchOperationsPersistencePort } from './BranchOperationsPersistencePort';
import type {
  BranchOperationalSnapshotDto,
  BranchOperationsRepository,
} from './BranchOperationsRepository';

const LAYER = 'BranchOperationsRepositoryAdapter';

const notFound = (entity: string, id: string) =>
  sdkFail(
    sdkError('NOT_FOUND', `${entity} not found`, {
      branchCode: 'NOT_FOUND',
      provider: LAYER,
      id,
    })
  );

const mapPersistenceError = (method: string, error: unknown) =>
  sdkFail(
    sdkError('UNAVAILABLE', BRANCH_ERROR_MESSAGES.REPOSITORY_UNAVAILABLE, {
      branchCode: 'REPOSITORY_UNAVAILABLE',
      provider: LAYER,
      method,
      cause: error instanceof Error ? error.message : String(error),
    })
  );

export class BranchOperationsRepositoryAdapter implements BranchOperationsRepository {
  constructor(private readonly persistencePort: BranchOperationsPersistencePort) {}

  async getBranchStatus(branchId: BranchId): SdkAsyncResult<BranchStatusSnapshot> {
    try {
      const document = await this.persistencePort.getBranchStatusDocument(branchId);
      if (!document) {
        return notFound('Branch status', branchId);
      }
      return sdkOk(mapBranchStatusDocument(document));
    } catch (error) {
      return mapPersistenceError('getBranchStatus', error);
    }
  }

  async getBranchHours(branchId: BranchId): SdkAsyncResult<BranchHoursSnapshot> {
    try {
      const document = await this.persistencePort.getBranchHoursDocument(branchId);
      if (!document) {
        return notFound('Branch hours', branchId);
      }
      return sdkOk(mapBranchHoursDocument(document));
    } catch (error) {
      return mapPersistenceError('getBranchHours', error);
    }
  }

  async getBranchCapacity(branchId: BranchId): SdkAsyncResult<BranchCapacityRecord> {
    try {
      const document = await this.persistencePort.getBranchCapacityDocument(branchId);
      if (!document) {
        return notFound('Branch capacity', branchId);
      }
      return sdkOk(mapBranchCapacityDocument(document));
    } catch (error) {
      return mapPersistenceError('getBranchCapacity', error);
    }
  }

  async getBranchInventory(branchId: BranchId): SdkAsyncResult<BranchInventorySnapshot> {
    try {
      const document = await this.persistencePort.getBranchInventoryDocument(branchId);
      if (!document) {
        return notFound('Branch inventory', branchId);
      }
      return sdkOk(mapBranchInventoryDocument(document));
    } catch (error) {
      return mapPersistenceError('getBranchInventory', error);
    }
  }

  async getOperationalSnapshot(
    branchId: BranchId
  ): SdkAsyncResult<BranchOperationalSnapshotDto> {
    try {
      const [statusDoc, hoursDoc, capacityDoc, inventoryDoc] = await Promise.all([
        this.persistencePort.getBranchStatusDocument(branchId),
        this.persistencePort.getBranchHoursDocument(branchId),
        this.persistencePort.getBranchCapacityDocument(branchId),
        this.persistencePort.getBranchInventoryDocument(branchId),
      ]);

      if (!statusDoc) {
        return notFound('Branch status', branchId);
      }
      if (!hoursDoc) {
        return notFound('Branch hours', branchId);
      }
      if (!capacityDoc) {
        return notFound('Branch capacity', branchId);
      }
      if (!inventoryDoc) {
        return notFound('Branch inventory', branchId);
      }

      const status = mapBranchStatusDocument(statusDoc);
      const hours = mapBranchHoursDocument(hoursDoc);
      const capacity = mapBranchCapacityDocument(capacityDoc);
      const inventory = mapBranchInventoryDocument(inventoryDoc);

      return sdkOk(
        mapOperationalSnapshotDto({
          branchId,
          tenantId: statusDoc.tenantId as BranchOperationalSnapshotDto['tenantId'],
          status,
          hours,
          capacity,
          inventory,
        })
      );
    } catch (error) {
      return mapPersistenceError('getOperationalSnapshot', error);
    }
  }
}

export const createBranchOperationsRepositoryAdapter = (
  persistencePort: BranchOperationsPersistencePort
): BranchOperationsRepository => new BranchOperationsRepositoryAdapter(persistencePort);

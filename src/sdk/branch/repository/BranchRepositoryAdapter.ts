/**
 * BranchSDK — BranchRepository adapter over persistence port (M5 PR-3).
 * Read-only — no writes, scoring, eligibility, or assignment.
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import type { TenantId } from '../../core/types';
import type {
  BranchCapacityRecord,
  BranchDetail,
  BranchHoursSnapshot,
  BranchInventorySnapshot,
  BranchListFilter,
  BranchRoutingPolicy,
  BranchStatusSnapshot,
  BranchSummary,
} from '../dto';
import { BRANCH_ERROR_MESSAGES } from '../errors/branchErrors';
import type { BranchId } from '../types/branded';
import type { BranchRepository } from './BranchRepository';
import {
  filterBranchDocuments,
  mapBranchCapacityDocument,
  mapBranchDocumentToDetail,
  mapBranchDocumentToSummary,
  mapBranchHoursDocument,
  mapBranchInventoryDocument,
  mapBranchListFilterToPersistence,
  mapBranchRoutingDocument,
  mapBranchStatusDocument,
} from './BranchRepositoryMapper';
import type { BranchPersistencePort } from './BranchRepositoryPorts';

const LAYER = 'BranchRepositoryAdapter';

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
    sdkError(
      'UNAVAILABLE',
      BRANCH_ERROR_MESSAGES.REPOSITORY_UNAVAILABLE,
      {
        branchCode: 'REPOSITORY_UNAVAILABLE',
        provider: LAYER,
        method,
        cause: error instanceof Error ? error.message : String(error),
      }
    )
  );

export class BranchRepositoryAdapter implements BranchRepository {
  constructor(private readonly persistencePort: BranchPersistencePort) {}

  async listBranches(filter: BranchListFilter): SdkAsyncResult<BranchSummary[]> {
    try {
      const persistenceFilter = mapBranchListFilterToPersistence(filter);
      const documents = await this.persistencePort.listBranchDocuments(persistenceFilter);
      const filtered = filterBranchDocuments(documents, persistenceFilter);
      return sdkOk(filtered.map(mapBranchDocumentToSummary));
    } catch (error) {
      return mapPersistenceError('listBranches', error);
    }
  }

  async getBranchById(branchId: BranchId): SdkAsyncResult<BranchDetail> {
    try {
      const document = await this.persistencePort.getBranchDocument(branchId);
      if (!document) {
        return notFound('Branch', branchId);
      }
      return sdkOk(mapBranchDocumentToDetail(document));
    } catch (error) {
      return mapPersistenceError('getBranchById', error);
    }
  }

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

  async getRoutingPolicy(tenantId: TenantId): SdkAsyncResult<BranchRoutingPolicy> {
    try {
      const document = await this.persistencePort.getBranchRoutingDocument(tenantId);
      if (!document) {
        return notFound('Branch routing policy', tenantId);
      }
      return sdkOk(mapBranchRoutingDocument(document));
    } catch (error) {
      return mapPersistenceError('getRoutingPolicy', error);
    }
  }
}

export const createBranchRepositoryAdapter = (
  persistencePort: BranchPersistencePort
): BranchRepository => new BranchRepositoryAdapter(persistencePort);

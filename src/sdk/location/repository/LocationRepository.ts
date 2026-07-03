/**
 * LocationSDK — persistence repository contract (read paths).
 * Firestore implementations live outside SDK core (M2 PR-7+).
 *
 * No implementation in PR-2.
 */

import type { BranchId, LocationId } from '../types/branded';
import type { TenantId } from '../../core/types';
import type { SdkAsyncResult } from '../../core/result';
import type { BranchLocationReadModel, GeoIndexEntry, LocationReadModel } from '../dto/repository';

export interface LocationRepositoryQuery {
  readonly tenantId?: TenantId;
  readonly branchId?: BranchId;
  readonly geohashPrefix?: string;
  readonly status?: 'active' | 'closed';
  readonly limit?: number;
}

export interface LocationRepository {
  /** Read a normalized location document by id. */
  getLocationById(locationId: LocationId): SdkAsyncResult<LocationReadModel>;

  /** Read a branch with embedded location. */
  getBranchById(branchId: BranchId): SdkAsyncResult<BranchLocationReadModel>;

  /** List branches for a tenant (owner scope). */
  listBranchesByTenant(
    tenantId: TenantId,
    query?: LocationRepositoryQuery
  ): SdkAsyncResult<BranchLocationReadModel[]>;

  /** Geohash prefix index query for discovery pre-filter. */
  queryGeoIndex(query: LocationRepositoryQuery): SdkAsyncResult<GeoIndexEntry[]>;
}

export interface LocationRepositoryFactory {
  create(): LocationRepository;
}

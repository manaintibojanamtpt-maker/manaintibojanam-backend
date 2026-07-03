/**
 * LocationSDK — persistence repository stub (M2 PR-6).
 * Firestore implementations arrive in M2 PR-7+ behind feature flags.
 */

import type { BranchId, LocationId } from '../types/branded';
import type { TenantId } from '../../core/types';
import type { SdkAsyncResult } from '../../core/result';
import type {
  BranchLocationReadModel,
  GeoIndexEntry,
  LocationReadModel,
} from '../dto/repository';
import type {
  LocationRepository,
  LocationRepositoryQuery,
} from '../repository/LocationRepository';
import { locationNotConfiguredAsync } from './notConfigured';

export class LocationRepositoryImpl implements LocationRepository {
  getLocationById(locationId: LocationId): SdkAsyncResult<LocationReadModel> {
    return locationNotConfiguredAsync('getLocationById', `LocationRepositoryImpl (${locationId})`);
  }

  getBranchById(branchId: BranchId): SdkAsyncResult<BranchLocationReadModel> {
    return locationNotConfiguredAsync('getBranchById', `LocationRepositoryImpl (${branchId})`);
  }

  listBranchesByTenant(
    tenantId: TenantId,
    _query?: LocationRepositoryQuery
  ): SdkAsyncResult<BranchLocationReadModel[]> {
    return locationNotConfiguredAsync(
      'listBranchesByTenant',
      `LocationRepositoryImpl (tenant=${tenantId})`
    );
  }

  queryGeoIndex(_query: LocationRepositoryQuery): SdkAsyncResult<GeoIndexEntry[]> {
    return locationNotConfiguredAsync('queryGeoIndex', 'LocationRepositoryImpl');
  }
}

export function createLocationRepositoryImpl(): LocationRepositoryImpl {
  return new LocationRepositoryImpl();
}

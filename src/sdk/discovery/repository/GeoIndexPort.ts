/**
 * DiscoverySDK — geoIndex read port (M3 PR-7).
 * Vendor-neutral geoIndex records — no Firestore types.
 */

import type { SdkAsyncResult } from '../../core/result';

export interface GeoIndexReadRecord {
  readonly id?: string;
  readonly geohashPrefix: string;
  readonly geohash: string;
  readonly branchId: string;
  readonly tenantId: string;
  readonly status?: string;
  readonly name?: string;
  readonly slug?: string;
}

export interface GeoIndexPort {
  queryByPrefixes(prefixes: readonly string[]): SdkAsyncResult<GeoIndexReadRecord[]>;
}

export interface GeoIndexPortFactory {
  create(): GeoIndexPort;
}

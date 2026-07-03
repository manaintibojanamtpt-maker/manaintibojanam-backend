/**
 * M3 PR-2 — Build DiscoverySDK query from customer location + facade input.
 * No LocationSDK or Firestore access.
 */

import type { SdkResult } from '../../sdk/core/result';
import { sdkError, sdkFail, sdkOk } from '../../sdk/core/resultHelpers';
import type { DiscoveryQuery } from '../../sdk/discovery/dto';
import type { Geohash } from '../../sdk/discovery/types/branded';
import type { TenantId } from '../../sdk/core/types';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import type { DiscoveryFacadeQuery } from './types';

export interface DiscoveryContextInput {
  readonly facadeQuery: DiscoveryFacadeQuery;
  readonly customerLocation: CustomerCanonicalLocation | null;
  readonly rankingEnabled?: boolean;
}

export interface DiscoveryContextMeta {
  readonly usedCustomerSession: boolean;
  readonly rankingEnabled: boolean;
}

export interface BuiltDiscoveryContext {
  readonly query: DiscoveryQuery;
  readonly meta: DiscoveryContextMeta;
}

export function buildDiscoveryQuery(input: DiscoveryContextInput): SdkResult<BuiltDiscoveryContext> {
  const point = resolveCustomerPoint(input.facadeQuery, input.customerLocation);
  if (!point.ok) {
    return point;
  }

  const geohash = resolveCustomerGeohash(input.facadeQuery, input.customerLocation);

  return sdkOk({
    query: {
      customerPoint: point.value,
      customerGeohash: geohash,
      radiusKm: input.facadeQuery.radiusKm,
      limit: input.facadeQuery.limit,
      searchText: input.facadeQuery.searchText?.trim() || undefined,
      cuisineTags: input.facadeQuery.cuisineTags,
      areaCode: input.facadeQuery.areaCode,
      tenantId: input.facadeQuery.tenantId as TenantId | undefined,
      includeClosed: input.facadeQuery.includeClosed,
      sortBy: input.rankingEnabled ? 'recommended' : 'distance',
    },
    meta: {
      usedCustomerSession: !input.facadeQuery.customerPoint && input.customerLocation !== null,
      rankingEnabled: input.rankingEnabled === true,
    },
  });
}

function resolveCustomerPoint(
  facadeQuery: DiscoveryFacadeQuery,
  customerLocation: CustomerCanonicalLocation | null
): SdkResult<{ lat: number; lng: number }> {
  if (facadeQuery.customerPoint) {
    const { lat, lng } = facadeQuery.customerPoint;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
      return sdkFail(sdkError('VALIDATION', 'Invalid customer coordinates override'));
    }
    return sdkOk({ lat, lng });
  }

  if (!customerLocation) {
    return sdkFail(
      sdkError('VALIDATION', 'Customer location is required for discovery', {
        field: 'customerPoint',
      })
    );
  }

  if (!Number.isFinite(customerLocation.lat) || !Number.isFinite(customerLocation.lng)) {
    return sdkFail(sdkError('VALIDATION', 'Stored customer location has invalid coordinates'));
  }

  return sdkOk({ lat: customerLocation.lat, lng: customerLocation.lng });
}

function resolveCustomerGeohash(
  facadeQuery: DiscoveryFacadeQuery,
  customerLocation: CustomerCanonicalLocation | null
): Geohash | undefined {
  const override = facadeQuery.customerGeohash?.trim();
  if (override) {
    return override as Geohash;
  }
  return customerLocation?.geohash as Geohash | undefined;
}

/**
 * M2 PR-9 — CanonicalLocation ↔ tenants.location (legacy-compatible).
 */

import type { TenantInfo } from '../../context/TenantContext';
import type { CanonicalLocation, OwnerAddressDraft } from './types';
import { EMPTY_OWNER_ADDRESS_DRAFT } from './types';

export interface TenantLocationPayload {
  readonly address: string;
  readonly city: string;
  readonly state: string;
  readonly pincode: string;
  readonly lat: number;
  readonly lng: number;
  readonly geohash: string;
  readonly stateCode: string;
  readonly districtCode: string;
  readonly districtName: string;
  readonly cityCode: string;
  readonly localityCode: string;
  readonly localityName: string;
  readonly referenceStateId?: string;
  readonly referenceDistrictId?: string;
  readonly referenceCityId?: string;
  readonly referenceLocalityId?: string;
  readonly landmark?: string;
  readonly formattedAddress: string;
  readonly addressModel: 'india_structured';
}

export function mapCanonicalLocationToTenantLocation(
  canonical: CanonicalLocation,
  draft?: Pick<OwnerAddressDraft, 'stateId' | 'districtId' | 'cityId' | 'localityId'>
): TenantLocationPayload {
  const streetLine = canonical.landmark?.trim()
    ? `${canonical.street.trim()}, ${canonical.landmark.trim()}`
    : canonical.street.trim();

  return {
    address: streetLine,
    city: canonical.cityName,
    state: canonical.stateName,
    pincode: canonical.pincode,
    lat: canonical.lat,
    lng: canonical.lng,
    geohash: canonical.geohash,
    stateCode: canonical.stateCode,
    districtCode: canonical.districtCode,
    districtName: canonical.districtName,
    cityCode: canonical.cityCode,
    localityCode: canonical.localityCode,
    localityName: canonical.localityName,
    referenceStateId: draft?.stateId || undefined,
    referenceDistrictId: draft?.districtId || undefined,
    referenceCityId: draft?.cityId || undefined,
    referenceLocalityId: draft?.localityId || undefined,
    landmark: canonical.landmark?.trim() || undefined,
    formattedAddress: canonical.formattedAddress,
    addressModel: 'india_structured',
  };
}

export function hydrateOwnerAddressDraftFromTenant(
  location?: TenantInfo['location']
): OwnerAddressDraft {
  if (!location || location.addressModel !== 'india_structured') {
    return {
      ...EMPTY_OWNER_ADDRESS_DRAFT,
      street: location?.address ?? '',
      pincode: location?.pincode ?? '',
      stateName: location?.state ?? '',
      cityName: location?.city ?? '',
    };
  }

  return {
    stateId: location.referenceStateId ?? location.stateCode ?? '',
    stateCode: location.stateCode ?? '',
    stateName: location.state ?? '',
    districtId: location.referenceDistrictId ?? location.districtCode ?? '',
    districtCode: location.districtCode ?? '',
    districtName: location.districtName ?? '',
    cityId: location.referenceCityId ?? location.cityCode ?? '',
    cityCode: location.cityCode ?? '',
    cityName: location.city ?? '',
    localityId: location.referenceLocalityId ?? location.localityCode ?? '',
    localityCode: location.localityCode ?? '',
    localityName: location.localityName ?? '',
    pincode: location.pincode ?? '',
    street: location.address ?? '',
    landmark: location.landmark ?? '',
    searchQuery: '',
  };
}

export function canonicalLocationFromTenant(
  location?: TenantInfo['location']
): CanonicalLocation | null {
  if (!location || location.addressModel !== 'india_structured') {
    return null;
  }
  if (!location.geohash || !location.lat || !location.lng) {
    return null;
  }

  return {
    country: 'IN',
    stateCode: location.stateCode ?? '',
    stateName: location.state ?? '',
    districtCode: location.districtCode ?? '',
    districtName: location.districtName ?? '',
    cityCode: location.cityCode ?? '',
    cityName: location.city ?? '',
    localityCode: location.localityCode ?? '',
    localityName: location.localityName ?? '',
    pincode: location.pincode ?? '',
    street: location.address ?? '',
    landmark: location.landmark,
    lat: location.lat,
    lng: location.lng,
    geohash: location.geohash,
    formattedAddress: location.formattedAddress ?? location.address ?? '',
    coordinateSource: 'geocode',
  };
}

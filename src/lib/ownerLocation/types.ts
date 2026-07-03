/**
 * M2 PR-9 — Owner registration India address types (presentation layer).
 */

export type IndiaAddressModel = 'legacy' | 'india_structured';

/** Form draft before geocoding resolves coordinates. */
export interface OwnerAddressDraft {
  readonly stateId: string;
  readonly stateCode: string;
  readonly stateName: string;
  readonly districtId: string;
  readonly districtCode: string;
  readonly districtName: string;
  readonly cityId: string;
  readonly cityCode: string;
  readonly cityName: string;
  readonly localityId: string;
  readonly localityCode: string;
  readonly localityName: string;
  readonly pincode: string;
  readonly street: string;
  readonly landmark: string;
  readonly searchQuery: string;
}

/** Normalized owner kitchen location after Open Geocoding resolution. */
export interface CanonicalLocation {
  readonly country: 'IN';
  readonly stateCode: string;
  readonly stateName: string;
  readonly districtCode: string;
  readonly districtName: string;
  readonly cityCode: string;
  readonly cityName: string;
  readonly localityCode: string;
  readonly localityName: string;
  readonly pincode: string;
  readonly street: string;
  readonly landmark?: string;
  readonly lat: number;
  readonly lng: number;
  readonly geohash: string;
  readonly formattedAddress: string;
  readonly coordinateSource: 'geocode';
}

export interface ReferenceSelectOption {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export const EMPTY_OWNER_ADDRESS_DRAFT: OwnerAddressDraft = {
  stateId: '',
  stateCode: '',
  stateName: '',
  districtId: '',
  districtCode: '',
  districtName: '',
  cityId: '',
  cityCode: '',
  cityName: '',
  localityId: '',
  localityCode: '',
  localityName: '',
  pincode: '',
  street: '',
  landmark: '',
  searchQuery: '',
};

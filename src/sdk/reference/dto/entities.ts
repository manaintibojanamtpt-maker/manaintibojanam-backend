/**
 * ReferenceSDK — administrative hierarchy DTOs (India-first, extensible).
 */

import type {
  CityId,
  CountryId,
  DistrictId,
  IsoCountryCode,
  LocalityId,
  PincodeId,
  StateAdministrationType,
  StateId,
} from '../types/branded';
import type { ReferenceEntityBase } from './base';

export interface ReferenceCountry extends ReferenceEntityBase<CountryId, null> {
  readonly kind: 'country';
  readonly isoCode: IsoCountryCode;
}

export interface ReferenceState extends ReferenceEntityBase<StateId, CountryId> {
  readonly kind: 'state';
  readonly administrationType: StateAdministrationType;
}

export interface ReferenceDistrict extends ReferenceEntityBase<DistrictId, StateId> {
  readonly kind: 'district';
}

export interface ReferenceCity extends ReferenceEntityBase<CityId, DistrictId> {
  readonly kind: 'city';
}

export interface ReferenceLocality extends ReferenceEntityBase<LocalityId, CityId> {
  readonly kind: 'locality';
}

export interface ReferencePincode extends ReferenceEntityBase<PincodeId, LocalityId> {
  readonly kind: 'pincode';
  /** Six-digit postal code (same as officialCode for India). */
  readonly postalCode: string;
}

/** Full hierarchy snapshot for a single pincode leaf (read model). */
export interface ReferenceHierarchyPath {
  readonly country: ReferenceCountry;
  readonly state: ReferenceState;
  readonly district: ReferenceDistrict;
  readonly city: ReferenceCity;
  readonly locality: ReferenceLocality;
  readonly pincode: ReferencePincode;
}

/**
 * ReferenceSDK — external data provider contract (strategy pattern).
 * Future implementations: static JSON bundles, CDN, admin API.
 *
 * No implementation in PR-3.
 */

import type { SdkAsyncResult } from '../../core/result';
import type {
  ReferenceCity,
  ReferenceCountry,
  ReferenceDistrict,
  ReferenceLocality,
  ReferencePincode,
  ReferenceState,
} from '../dto/entities';
import type { ReferenceChildListFilter, ReferenceCountryListFilter } from '../dto/filters';
import type {
  CityId,
  CountryId,
  DistrictId,
  LocalityId,
  ReferenceDataProviderKind,
  StateId,
} from '../types/branded';

export interface ReferenceDataProvider {
  readonly kind: ReferenceDataProviderKind;

  getCountries(filter?: ReferenceCountryListFilter): SdkAsyncResult<ReferenceCountry[]>;

  getStates(countryId: CountryId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceState[]>;

  getDistricts(stateId: StateId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceDistrict[]>;

  getCities(districtId: DistrictId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceCity[]>;

  getLocalities(cityId: CityId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceLocality[]>;

  getPincodes(localityId: LocalityId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferencePincode[]>;
}

export interface ReferenceDataProviderFactory {
  create(kind?: ReferenceDataProviderKind): ReferenceDataProvider;
}

export interface CreateReferenceDataProviderOptions {
  readonly kind?: ReferenceDataProviderKind;
}

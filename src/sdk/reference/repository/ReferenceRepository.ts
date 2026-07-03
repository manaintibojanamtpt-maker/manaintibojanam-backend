/**
 * ReferenceSDK — persistence / data-source repository contract.
 * Static bundle and Firestore implementations live outside SDK core.
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
  StateId,
} from '../types/branded';

export interface ReferenceRepository {
  getCountries(filter?: ReferenceCountryListFilter): SdkAsyncResult<ReferenceCountry[]>;

  getStates(countryId: CountryId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceState[]>;

  getDistricts(stateId: StateId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceDistrict[]>;

  getCities(districtId: DistrictId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceCity[]>;

  getLocalities(cityId: CityId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceLocality[]>;

  getPincodes(localityId: LocalityId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferencePincode[]>;
}

export interface ReferenceRepositoryFactory {
  create(): ReferenceRepository;
}

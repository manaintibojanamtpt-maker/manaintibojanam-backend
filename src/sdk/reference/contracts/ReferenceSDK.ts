/**
 * ReferenceSDK — public contract (interface only; M2 PR-3 foundation).
 * ADR-011: canonical India administrative dataset boundary.
 *
 * No JSON bundles, Firestore, REST, or UI in this contract.
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
import type { ReferenceSDKOptions } from '../shared/options';

/**
 * Public reference data SDK surface for presentation layer.
 * Implementations arrive in M2 PR-3+ data bundle PRs — not in PR-3 contracts.
 */
export interface ReferenceSDK {
  /** Root — typically returns India (IN) in M2 scope. */
  getCountries(filter?: ReferenceCountryListFilter): SdkAsyncResult<ReferenceCountry[]>;

  getStates(countryId: CountryId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceState[]>;

  getDistricts(stateId: StateId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceDistrict[]>;

  getCities(districtId: DistrictId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceCity[]>;

  getLocalities(cityId: CityId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferenceLocality[]>;

  getPincodes(localityId: LocalityId, filter?: ReferenceChildListFilter): SdkAsyncResult<ReferencePincode[]>;
}

export interface ReferenceSDKFactory {
  create(options?: ReferenceSDKOptions): ReferenceSDK;
}

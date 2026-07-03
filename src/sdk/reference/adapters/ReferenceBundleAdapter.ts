/**
 * ReferenceSDK — public adapter delegating to ReferenceRepository (M2 PR-5).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { ReferenceSDK } from '../contracts/ReferenceSDK';
import type {
  ReferenceCity,
  ReferenceCountry,
  ReferenceDistrict,
  ReferenceLocality,
  ReferencePincode,
  ReferenceState,
} from '../dto/entities';
import type { ReferenceChildListFilter, ReferenceCountryListFilter } from '../dto/filters';
import type { ReferenceRepository } from '../repository/ReferenceRepository';
import type {
  CityId,
  CountryId,
  DistrictId,
  LocalityId,
  StateId,
} from '../types/branded';

export class ReferenceBundleAdapter implements ReferenceSDK {
  constructor(private readonly repository: ReferenceRepository) {}

  getCountries(filter?: ReferenceCountryListFilter): SdkAsyncResult<ReferenceCountry[]> {
    return this.repository.getCountries(filter);
  }

  getStates(
    countryId: CountryId,
    filter?: ReferenceChildListFilter
  ): SdkAsyncResult<ReferenceState[]> {
    return this.repository.getStates(countryId, filter);
  }

  getDistricts(
    stateId: StateId,
    filter?: ReferenceChildListFilter
  ): SdkAsyncResult<ReferenceDistrict[]> {
    return this.repository.getDistricts(stateId, filter);
  }

  getCities(
    districtId: DistrictId,
    filter?: ReferenceChildListFilter
  ): SdkAsyncResult<ReferenceCity[]> {
    return this.repository.getCities(districtId, filter);
  }

  getLocalities(
    cityId: CityId,
    filter?: ReferenceChildListFilter
  ): SdkAsyncResult<ReferenceLocality[]> {
    return this.repository.getLocalities(cityId, filter);
  }

  getPincodes(
    localityId: LocalityId,
    filter?: ReferenceChildListFilter
  ): SdkAsyncResult<ReferencePincode[]> {
    return this.repository.getPincodes(localityId, filter);
  }
}

export function createReferenceBundleAdapter(
  repository: ReferenceRepository
): ReferenceBundleAdapter {
  return new ReferenceBundleAdapter(repository);
}

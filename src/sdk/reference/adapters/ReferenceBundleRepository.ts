/**
 * ReferenceSDK — repository implementation backed by static India bundle.
 */

import { sdkError, sdkFail, sdkFromError, sdkOk } from '../../core/resultHelpers';
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
import type { ReferenceRepository } from '../repository/ReferenceRepository';
import type {
  CityId,
  CountryId,
  DistrictId,
  LocalityId,
  StateId,
} from '../types/branded';
import { applyActiveFilter, applyIsoCodeFilter, applyLimit } from './applyListFilters';
import type { ReferenceBundleIndex } from './bundleCache';
import {
  mapBundleCity,
  mapBundleCountry,
  mapBundleDistrict,
  mapBundleLocality,
  mapBundlePincode,
  mapBundleState,
} from './mapBundleToReferenceDto';
import type { StaticBundleProvider } from '../providers/StaticBundleProvider';

export class ReferenceBundleRepository implements ReferenceRepository {
  constructor(private readonly provider: StaticBundleProvider) {}

  private getIndex(): ReferenceBundleIndex {
    return this.provider.getIndex();
  }

  async getCountries(filter?: ReferenceCountryListFilter): SdkAsyncResult<ReferenceCountry[]> {
    try {
      const index = this.getIndex();
      let countries = [mapBundleCountry(index.bundle.country)];
      countries = applyIsoCodeFilter(countries, filter?.isoCode);
      countries = applyActiveFilter(countries, filter?.includeInactive);
      countries = applyLimit(countries, filter?.limit);
      return sdkOk(countries);
    } catch (error) {
      return sdkFromError(error, 'INTERNAL');
    }
  }

  async getStates(
    countryId: CountryId,
    filter?: ReferenceChildListFilter
  ): SdkAsyncResult<ReferenceState[]> {
    if (!countryId) {
      return sdkFail(sdkError('VALIDATION', 'countryId is required to list states'));
    }

    try {
      const index = this.getIndex();
      if (!index.countriesById.has(countryId)) {
        return sdkFail(
          sdkError('NOT_FOUND', `Country not found: ${countryId}`, { entityId: countryId })
        );
      }

      const country = index.countriesById.get(countryId)!;
      if (filter?.parentActiveOnly && !country.active) {
        return sdkOk([]);
      }

      let states = (index.statesByCountryId.get(countryId) ?? []).map(mapBundleState);
      states = applyActiveFilter(states, filter?.includeInactive);
      states = applyLimit(states, filter?.limit);
      return sdkOk(states);
    } catch (error) {
      return sdkFromError(error, 'INTERNAL');
    }
  }

  async getDistricts(
    stateId: StateId,
    filter?: ReferenceChildListFilter
  ): SdkAsyncResult<ReferenceDistrict[]> {
    if (!stateId) {
      return sdkFail(sdkError('VALIDATION', 'stateId is required to list districts'));
    }

    try {
      const index = this.getIndex();
      const state = index.statesById.get(stateId);
      if (!state) {
        return sdkFail(
          sdkError('NOT_FOUND', `State not found: ${stateId}`, { entityId: stateId })
        );
      }

      if (filter?.parentActiveOnly && !state.active) {
        return sdkOk([]);
      }

      let districts = (index.districtsByStateId.get(stateId) ?? []).map(mapBundleDistrict);
      districts = applyActiveFilter(districts, filter?.includeInactive);
      districts = applyLimit(districts, filter?.limit);
      return sdkOk(districts);
    } catch (error) {
      return sdkFromError(error, 'INTERNAL');
    }
  }

  async getCities(
    districtId: DistrictId,
    filter?: ReferenceChildListFilter
  ): SdkAsyncResult<ReferenceCity[]> {
    if (!districtId) {
      return sdkFail(sdkError('VALIDATION', 'districtId is required to list cities'));
    }

    try {
      const index = this.getIndex();
      const district = index.districtsById.get(districtId);
      if (!district) {
        return sdkFail(
          sdkError('NOT_FOUND', `District not found: ${districtId}`, { entityId: districtId })
        );
      }

      if (filter?.parentActiveOnly && !district.active) {
        return sdkOk([]);
      }

      let cities = (index.citiesByDistrictId.get(districtId) ?? []).map(mapBundleCity);
      cities = applyActiveFilter(cities, filter?.includeInactive);
      cities = applyLimit(cities, filter?.limit);
      return sdkOk(cities);
    } catch (error) {
      return sdkFromError(error, 'INTERNAL');
    }
  }

  async getLocalities(
    cityId: CityId,
    filter?: ReferenceChildListFilter
  ): SdkAsyncResult<ReferenceLocality[]> {
    if (!cityId) {
      return sdkFail(sdkError('VALIDATION', 'cityId is required to list localities'));
    }

    try {
      const index = this.getIndex();
      const city = index.citiesById.get(cityId);
      if (!city) {
        return sdkFail(
          sdkError('NOT_FOUND', `City not found: ${cityId}`, { entityId: cityId })
        );
      }

      if (filter?.parentActiveOnly && !city.active) {
        return sdkOk([]);
      }

      let localities = (index.localitiesByCityId.get(cityId) ?? []).map(mapBundleLocality);
      localities = applyActiveFilter(localities, filter?.includeInactive);
      localities = applyLimit(localities, filter?.limit);
      return sdkOk(localities);
    } catch (error) {
      return sdkFromError(error, 'INTERNAL');
    }
  }

  async getPincodes(
    localityId: LocalityId,
    filter?: ReferenceChildListFilter
  ): SdkAsyncResult<ReferencePincode[]> {
    if (!localityId) {
      return sdkFail(sdkError('VALIDATION', 'localityId is required to list pincodes'));
    }

    try {
      const index = this.getIndex();
      const locality = index.localitiesById.get(localityId);
      if (!locality) {
        return sdkFail(
          sdkError('NOT_FOUND', `Locality not found: ${localityId}`, { entityId: localityId })
        );
      }

      if (filter?.parentActiveOnly && !locality.active) {
        return sdkOk([]);
      }

      let pincodes = (index.pincodesByLocalityId.get(localityId) ?? []).map(mapBundlePincode);
      pincodes = applyActiveFilter(pincodes, filter?.includeInactive);
      pincodes = applyLimit(pincodes, filter?.limit);
      return sdkOk(pincodes);
    } catch (error) {
      return sdkFromError(error, 'INTERNAL');
    }
  }
}

export function createReferenceBundleRepository(
  provider: StaticBundleProvider
): ReferenceBundleRepository {
  return new ReferenceBundleRepository(provider);
}

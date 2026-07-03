/**
 * LocationSDK — ReferenceProvider bridge to ReferenceSDK (M2 PR-6).
 * Maps ReferenceSDK hierarchy reads to LocationSDK reference DTOs.
 */

import type { SdkAsyncResult, SdkFailure, SdkResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import type { ReferenceSDK } from '../../reference/contracts/ReferenceSDK';
import type { ReferenceState } from '../../reference/dto/entities';
import type { CityId, DistrictId, StateId } from '../../reference/types/branded';
import type {
  AreaReference,
  CityReference,
  DistrictReference,
  PincodeValidationResult,
  StateReference,
} from '../dto/reference';
import type { CountryCode } from '../types/branded';
import type { ReferenceProvider } from '../providers/ReferenceProvider';

const INDIA_ISO = 'IN' as const;

const propagateFailure = <T>(result: SdkResult<unknown>): SdkResult<T> => {
  if (result.ok) {
    return sdkFail(sdkError('INTERNAL', 'Unexpected success while propagating SdkFailure'));
  }
  return sdkFail((result as SdkFailure).error);
};

function mapState(state: ReferenceState): StateReference {
  return {
    code: state.officialCode,
    name: state.displayName,
    type: state.administrationType === 'union_territory' ? 'union_territory' : 'state',
  };
}

export class ReferenceSdkReferenceProvider implements ReferenceProvider {
  readonly kind = 'static_json' as const;

  constructor(private readonly reference: ReferenceSDK) {}

  async getStates(country: CountryCode = 'IN'): SdkAsyncResult<StateReference[]> {
    if (country !== 'IN') {
      return sdkOk([]);
    }

    const countries = await this.reference.getCountries({ isoCode: INDIA_ISO });
    if (!countries.ok) {
      return propagateFailure(countries);
    }
    const india = countries.value[0];
    if (!india) {
      return sdkOk([]);
    }

    const states = await this.reference.getStates(india.id);
    if (!states.ok) {
      return propagateFailure(states);
    }
    return sdkOk(states.value.map(mapState));
  }

  async getDistricts(stateCode: string): SdkAsyncResult<DistrictReference[]> {
    const stateId = await this.resolveStateId(stateCode);
    if (!stateId.ok) {
      return propagateFailure(stateId);
    }

    const districts = await this.reference.getDistricts(stateId.value);
    if (!districts.ok) {
      return propagateFailure(districts);
    }

    return sdkOk(
      districts.value.map((district) => ({
        code: district.officialCode,
        name: district.displayName,
        stateCode,
      }))
    );
  }

  async getCities(districtCode: string): SdkAsyncResult<CityReference[]> {
    const districtId = await this.resolveDistrictId(districtCode);
    if (!districtId.ok) {
      return propagateFailure(districtId);
    }

    const cities = await this.reference.getCities(districtId.value);
    if (!cities.ok) {
      return propagateFailure(cities);
    }

    return sdkOk(
      cities.value.map((city) => ({
        code: city.officialCode,
        name: city.displayName,
        districtCode,
      }))
    );
  }

  async getAreas(cityCode: string): SdkAsyncResult<AreaReference[]> {
    const cityId = await this.resolveCityId(cityCode);
    if (!cityId.ok) {
      return propagateFailure(cityId);
    }

    const localities = await this.reference.getLocalities(cityId.value);
    if (!localities.ok) {
      return propagateFailure(localities);
    }

    const areas: AreaReference[] = [];
    for (const locality of localities.value) {
      const pincodes = await this.reference.getPincodes(locality.id);
      const postalCodes =
        pincodes.ok ? pincodes.value.map((entry) => entry.postalCode) : ([] as string[]);

      areas.push({
        code: locality.officialCode,
        name: locality.displayName,
        cityCode,
        pincodes: postalCodes,
      });
    }

    return sdkOk(areas);
  }

  validatePincode(pincode: string, areaCode?: string): SdkResult<PincodeValidationResult> {
    if (!/^\d{6}$/.test(pincode)) {
      return sdkOk({
        pincode,
        isValid: false,
        country: 'IN',
      });
    }

    void areaCode;
    return sdkFail(
      sdkError('NOT_CONFIGURED', 'validatePincode requires async reference lookup — use ReferenceSDK directly', {
        locationCode: 'REFERENCE_DATA_UNAVAILABLE',
      })
    );
  }

  private async resolveStateId(stateCode: string): SdkAsyncResult<StateId> {
    const states = await this.getStates('IN');
    if (!states.ok) {
      return propagateFailure(states);
    }
    const match = states.value.find((state) => state.code === stateCode);
    if (!match) {
      return sdkFail(sdkError('NOT_FOUND', `State not found: ${stateCode}`, { field: 'stateCode' }));
    }

    const countries = await this.reference.getCountries({ isoCode: INDIA_ISO });
    if (!countries.ok) {
      return propagateFailure(countries);
    }
    const india = countries.value[0];
    if (!india) {
      return sdkFail(sdkError('NOT_FOUND', 'India country record not found'));
    }

    const refStates = await this.reference.getStates(india.id);
    if (!refStates.ok) {
      return propagateFailure(refStates);
    }
    const refState = refStates.value.find((state) => state.officialCode === stateCode);
    if (!refState) {
      return sdkFail(sdkError('NOT_FOUND', `State not found: ${stateCode}`, { field: 'stateCode' }));
    }
    return sdkOk(refState.id);
  }

  private async resolveDistrictId(districtCode: string): SdkAsyncResult<DistrictId> {
    const countries = await this.reference.getCountries({ isoCode: INDIA_ISO });
    if (!countries.ok) {
      return propagateFailure(countries);
    }
    const india = countries.value[0];
    if (!india) {
      return sdkFail(sdkError('NOT_FOUND', 'India country record not found'));
    }

    const states = await this.reference.getStates(india.id);
    if (!states.ok) {
      return propagateFailure(states);
    }

    for (const state of states.value) {
      const districts = await this.reference.getDistricts(state.id);
      if (!districts.ok) {
        return propagateFailure(districts);
      }
      const match = districts.value.find((district) => district.officialCode === districtCode);
      if (match) {
        return sdkOk(match.id);
      }
    }

    return sdkFail(
      sdkError('NOT_FOUND', `District not found: ${districtCode}`, { field: 'districtCode' })
    );
  }

  private async resolveCityId(cityCode: string): SdkAsyncResult<CityId> {
    const countries = await this.reference.getCountries({ isoCode: INDIA_ISO });
    if (!countries.ok) {
      return propagateFailure(countries);
    }
    const india = countries.value[0];
    if (!india) {
      return sdkFail(sdkError('NOT_FOUND', 'India country record not found'));
    }

    const states = await this.reference.getStates(india.id);
    if (!states.ok) {
      return propagateFailure(states);
    }

    for (const state of states.value) {
      const districts = await this.reference.getDistricts(state.id);
      if (!districts.ok) {
        return propagateFailure(districts);
      }
      for (const district of districts.value) {
        const cities = await this.reference.getCities(district.id);
        if (!cities.ok) {
          return propagateFailure(cities);
        }
        const match = cities.value.find((city) => city.officialCode === cityCode);
        if (match) {
          return sdkOk(match.id);
        }
      }
    }

    return sdkFail(sdkError('NOT_FOUND', `City not found: ${cityCode}`, { field: 'cityCode' }));
  }
}

export function createReferenceSdkReferenceProvider(
  reference: ReferenceSDK
): ReferenceSdkReferenceProvider {
  return new ReferenceSdkReferenceProvider(reference);
}

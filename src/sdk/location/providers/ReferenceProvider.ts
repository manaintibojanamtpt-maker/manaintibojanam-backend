/**
 * LocationSDK — India administrative reference data provider contract.
 * Serves state/district/city/area dropdowns and pincode validation.
 *
 * Data source: static JSON bundles (M2 PR-3) — no paid APIs.
 * No implementation in PR-2.
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type { CountryCode } from '../types/branded';
import type {
  AreaReference,
  CityReference,
  DistrictReference,
  PincodeValidationResult,
  StateReference,
} from '../dto/reference';

export interface ReferenceProvider {
  readonly kind: 'static_json' | 'stub';

  getStates(country?: CountryCode): SdkAsyncResult<StateReference[]>;

  getDistricts(stateCode: string): SdkAsyncResult<DistrictReference[]>;

  getCities(districtCode: string): SdkAsyncResult<CityReference[]>;

  getAreas(cityCode: string): SdkAsyncResult<AreaReference[]>;

  validatePincode(pincode: string, areaCode?: string): SdkResult<PincodeValidationResult>;
}

export interface ReferenceProviderFactory {
  create(): ReferenceProvider;
}

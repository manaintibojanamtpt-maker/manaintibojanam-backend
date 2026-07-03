/**
 * LocationSDK — India administrative reference data DTOs.
 */

import type { CountryCode } from '../types/branded';

export interface StateReference {
  readonly code: string;
  readonly name: string;
  readonly type: 'state' | 'union_territory';
}

export interface DistrictReference {
  readonly code: string;
  readonly name: string;
  readonly stateCode: string;
}

export interface CityReference {
  readonly code: string;
  readonly name: string;
  readonly districtCode: string;
}

export interface AreaReference {
  readonly code: string;
  readonly name: string;
  readonly cityCode: string;
  readonly pincodes: readonly string[];
}

export interface PincodeValidationResult {
  readonly pincode: string;
  readonly isValid: boolean;
  readonly matchedAreas?: readonly AreaReference[];
  readonly country: CountryCode;
}

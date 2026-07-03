/**
 * ReferenceSDK — branded identifier types for administrative entities.
 */

export type CountryId = string & { readonly __brand: 'CountryId' };
export type StateId = string & { readonly __brand: 'StateId' };
export type DistrictId = string & { readonly __brand: 'DistrictId' };
export type CityId = string & { readonly __brand: 'CityId' };
export type LocalityId = string & { readonly __brand: 'LocalityId' };
export type PincodeId = string & { readonly __brand: 'PincodeId' };

/** ISO 3166-1 alpha-2 country code (e.g. IN). */
export type IsoCountryCode = string & { readonly __brand: 'IsoCountryCode' };

export type ReferenceDataProviderKind = 'static_bundle' | 'api' | 'stub';

export type StateAdministrationType = 'state' | 'union_territory';

export type ReferenceEntityKind =
  | 'country'
  | 'state'
  | 'district'
  | 'city'
  | 'locality'
  | 'pincode';

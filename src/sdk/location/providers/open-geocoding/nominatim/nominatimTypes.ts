/**
 * LocationSDK — Nominatim API response shapes (M2 PR-8).
 */

export interface NominatimAddress {
  readonly postcode?: string;
  readonly state?: string;
  readonly state_district?: string;
  readonly city?: string;
  readonly town?: string;
  readonly village?: string;
  readonly suburb?: string;
  readonly neighbourhood?: string;
  readonly road?: string;
  readonly country?: string;
  readonly country_code?: string;
}

export interface NominatimSearchResult {
  readonly place_id: number;
  readonly lat: string;
  readonly lon: string;
  readonly display_name: string;
  readonly importance?: number;
  readonly address?: NominatimAddress;
}

export type NominatimReverseResult = NominatimSearchResult;

export interface NominatimSearchQuery {
  readonly q: string;
  readonly format: 'json';
  readonly addressdetails: '1';
  readonly limit: string;
  readonly countrycodes?: string;
}

export interface NominatimReverseQuery {
  readonly lat: string;
  readonly lon: string;
  readonly format: 'json';
  readonly addressdetails: '1';
}

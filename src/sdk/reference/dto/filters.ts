/**
 * ReferenceSDK — query filters for repository and SDK list methods.
 */

import type { CountryId } from '../types/branded';

export interface ReferenceListFilter {
  /** When false, return only active records (default behaviour in future adapters). */
  readonly includeInactive?: boolean;
  readonly limit?: number;
}

export interface ReferenceCountryListFilter extends ReferenceListFilter {
  readonly isoCode?: string;
}

export interface ReferenceChildListFilter extends ReferenceListFilter {
  readonly parentActiveOnly?: boolean;
}

export interface ReferenceLookupByCodeInput {
  readonly countryId?: CountryId;
  readonly officialCode: string;
}

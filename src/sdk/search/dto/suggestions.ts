/**
 * SearchSDK — suggestion and autocomplete DTOs (M4 foundation).
 */

import type { GeoPoint } from '../../location/dto/geo';
import type { Geohash } from '../../discovery/types/branded';
import type { SearchSuggestionKind } from '../types/branded';

export interface SearchSuggestion {
  readonly id: string;
  readonly label: string;
  readonly kind: SearchSuggestionKind;
  readonly payload?: Readonly<Record<string, string>>;
  readonly score: number;
}

export interface SuggestFilter {
  readonly text?: string;
  readonly customerPoint: GeoPoint;
  readonly customerGeohash?: Geohash;
  readonly limit?: number;
}

export interface AutocompleteFilter {
  readonly prefix: string;
  readonly kind?: SearchSuggestionKind;
  readonly customerPoint?: GeoPoint;
  readonly limit?: number;
}

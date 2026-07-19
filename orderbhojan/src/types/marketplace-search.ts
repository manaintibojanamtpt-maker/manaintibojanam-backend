import type { RestaurantPublic } from './marketplace';

export type SearchResultType =
  | 'restaurant'
  | 'food'
  | 'category'
  | 'collection'
  | 'offer'
  | 'cloud_kitchen'
  | 'brand';

export type SearchSort =
  | 'popularity'
  | 'distance'
  | 'rating'
  | 'newest'
  | 'alphabetical';

export interface SearchFilters {
  readonly cuisines?: readonly string[];
  readonly vegOnly?: boolean;
  readonly nonVegOnly?: boolean;
  readonly cloudKitchenOnly?: boolean;
  readonly openNowOnly?: boolean;
  readonly offersOnly?: boolean;
  readonly minRating?: number;
  readonly maxDistanceKm?: number;
  readonly maxEtaMinutes?: number;
  readonly maxDeliveryFee?: number;
  readonly priceRange?: 'budget' | 'mid' | 'premium';
  readonly sort?: SearchSort;
}

export interface SearchResultItem {
  readonly id: string;
  readonly type: SearchResultType;
  readonly label: string;
  readonly subtitle?: string;
  readonly imageUrl?: string;
  readonly badge?: string;
  readonly slug?: string;
  readonly restaurant?: RestaurantPublic;
  readonly meta?: Readonly<Record<string, string | number | boolean>>;
}

export interface SearchResultSection {
  readonly id: string;
  readonly title: string;
  readonly type: SearchResultType;
  readonly items: readonly SearchResultItem[];
  readonly total?: number;
}

export interface SearchPlatformResponse {
  readonly query: string;
  readonly sections: readonly SearchResultSection[];
  readonly meta: {
    readonly provider: string;
    readonly totalResults: number;
    readonly tookMs?: number;
  };
}

export interface MenuItemSearchResponse {
  readonly query: string;
  readonly items: readonly SearchResultItem[];
  readonly meta: {
    readonly provider: string;
    readonly totalResults: number;
    readonly tookMs?: number;
  };
}

export interface SearchSuggestion {
  readonly id: string;
  readonly label: string;
  readonly type: 'query' | 'restaurant' | 'cuisine' | 'food' | 'collection';
  readonly highlight?: string;
}

export interface SearchSuggestionsResponse {
  readonly query: string;
  readonly suggestions: readonly SearchSuggestion[];
}

export interface SearchTermChip {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
}

export interface SearchTrendingResponse {
  readonly trending: readonly SearchTermChip[];
  readonly popular: readonly SearchTermChip[];
}

export interface SearchRecentResponse {
  readonly recent: readonly SearchTermChip[];
}

export type SearchBrowseSectionKind = 'chips' | 'rail' | 'list';

export interface SearchBrowseItem {
  readonly id: string;
  readonly label: string;
  readonly subtitle?: string;
  readonly emoji?: string;
  readonly query?: string;
}

export interface SearchBrowseSection {
  readonly id: string;
  readonly title: string;
  readonly kind: SearchBrowseSectionKind;
  readonly items: readonly SearchBrowseItem[];
}

export interface SearchCollectionsResponse {
  readonly sections: readonly SearchBrowseSection[];
}

export interface SearchQueryParams {
  readonly q: string;
  readonly lat: number;
  readonly lng: number;
  readonly limit?: number;
  readonly filters?: SearchFilters;
}

export interface SearchBrowseParams {
  readonly lat: number;
  readonly lng: number;
}

export type SearchAnalyticsEventType =
  | 'search_submit'
  | 'search_result_click'
  | 'search_no_results'
  | 'search_suggestion_click'
  | 'search_filter_apply'
  | 'search_clear';

export interface SearchAnalyticsEvent {
  readonly type: SearchAnalyticsEventType;
  readonly query?: string;
  readonly resultId?: string;
  readonly resultType?: SearchResultType;
  readonly filterKeys?: readonly string[];
  readonly timestamp: string;
}

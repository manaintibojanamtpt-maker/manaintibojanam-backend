/**
 * SearchSDK — structured filter DTOs (M4 foundation).
 */

export interface CuisineFilter {
  readonly tags: readonly string[];
  readonly matchMode?: 'any' | 'all';
}

export interface AreaFilter {
  readonly areaCode?: string;
  readonly localityName?: string;
  readonly cityName?: string;
  readonly pincode?: string;
  readonly districtName?: string;
}

export interface TagFilter {
  readonly tags: readonly string[];
  readonly matchMode?: 'any' | 'all';
}

/** Composable filter bundle on SearchQuery. */
export interface SearchFilter {
  readonly restaurantName?: string;
  readonly cuisine?: CuisineFilter;
  readonly area?: AreaFilter;
  readonly tags?: TagFilter;
  readonly foodItem?: string;
}

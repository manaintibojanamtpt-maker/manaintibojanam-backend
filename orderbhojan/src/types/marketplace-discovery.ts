import type { KitchenFormat, RestaurantPublic } from './marketplace';

export type DiscoveryCollectionId =
  | 'nearby'
  | 'top-rated'
  | 'fast-delivery'
  | 'cloud-kitchens'
  | 'recently-added'
  | 'trending'
  | 'recommended'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'late-night'
  | 'offers'
  | 'festival-specials'
  | 'popular-near-you'
  | 'new-on-orderbhojan'
  | 'healthy-choices'
  | 'family-meals'
  | 'beverages'
  | 'desserts'
  | 'featured';

export type DiscoverySort =
  | 'popularity'
  | 'eta'
  | 'distance'
  | 'rating'
  | 'newest'
  | 'alphabetical';

export interface DiscoveryFilters {
  readonly maxDistanceKm?: number;
  readonly minRating?: number;
  readonly maxDeliveryFee?: number;
  readonly vegOnly?: boolean;
  readonly cloudKitchenOnly?: boolean;
  readonly kitchenFormat?: KitchenFormat;
  readonly offersOnly?: boolean;
  readonly openNowOnly?: boolean;
  readonly cuisines?: readonly string[];
  readonly sort?: DiscoverySort;
}

export interface DiscoveryPagination {
  readonly page: number;
  readonly limit: number;
  readonly hasMore: boolean;
  readonly total?: number;
}

export interface DiscoveryCollection {
  readonly id: DiscoveryCollectionId;
  readonly title: string;
  readonly subtitle?: string;
  readonly restaurants: readonly RestaurantPublic[];
  readonly pagination?: DiscoveryPagination;
  readonly backedByApi: boolean;
}

export interface DiscoveryHomeResponse {
  readonly locationLabel?: string;
  readonly collections: readonly DiscoveryCollection[];
}

export interface DiscoveryCollectionResponse {
  readonly collection: DiscoveryCollection;
}

export interface DiscoveryQueryParams {
  readonly lat: number;
  readonly lng: number;
  readonly page?: number;
  readonly limit?: number;
  readonly filters?: DiscoveryFilters;
}

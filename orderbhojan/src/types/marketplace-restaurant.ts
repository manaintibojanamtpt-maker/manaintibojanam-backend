import type { RestaurantPublic } from './marketplace';

export type RestaurantOpenStatus = 'open' | 'closed' | 'closing_soon';

export interface RestaurantGalleryImage {
  readonly id: string;
  readonly url: string;
  readonly caption?: string;
}

export interface RestaurantOffer {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly badge?: string;
}

export interface RestaurantHighlight {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
}

export interface RestaurantPolicy {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

export interface RestaurantOperatingHour {
  readonly day: string;
  readonly open: string;
  readonly close: string;
  readonly isToday?: boolean;
}

export interface RestaurantServiceability {
  readonly delivery: boolean;
  readonly pickup: boolean;
  readonly message?: string;
}

/** Public restaurant experience DTO — never exposes internal BhojanOS identifiers. */
export interface RestaurantExperiencePublic {
  readonly restaurantId: string;
  readonly slug: string;
  readonly displayName: string;
  readonly coverImage?: string;
  readonly logo?: string;
  readonly rating?: number;
  readonly ratingCount?: number;
  readonly deliveryFee?: number | null;
  readonly deliveryFeeKnown?: boolean;
  readonly distance?: number;
  readonly eta?: { readonly min: number; readonly max: number };
  readonly cuisines: readonly string[];
  readonly priceRange?: string;
  readonly veg: boolean;
  readonly kitchenDietary?: 'pure_veg' | 'veg_friendly' | 'non_veg' | 'unknown';
  readonly cloudKitchen: boolean;
  readonly openStatus: RestaurantOpenStatus;
  readonly todayHours?: string;
  readonly gallery: readonly RestaurantGalleryImage[];
  readonly description?: string;
  readonly offers: readonly RestaurantOffer[];
  readonly badges: readonly string[];
  readonly subscriptionEnabled?: boolean;
}

export interface RestaurantExperienceResponse {
  readonly experience: RestaurantExperiencePublic;
  readonly hours: readonly RestaurantOperatingHour[];
  readonly serviceability: RestaurantServiceability;
  readonly policies: readonly RestaurantPolicy[];
  readonly highlights: readonly RestaurantHighlight[];
}

export interface RestaurantGalleryResponse {
  readonly slug: string;
  readonly images: readonly RestaurantGalleryImage[];
}

export interface RestaurantOffersResponse {
  readonly slug: string;
  readonly offers: readonly RestaurantOffer[];
}

export interface RestaurantHighlightsResponse {
  readonly slug: string;
  readonly highlights: readonly RestaurantHighlight[];
}

export interface RestaurantExperienceQueryParams {
  readonly slug: string;
  readonly lat: number;
  readonly lng: number;
}

/** Internal API envelope — contextToken never reaches UI. */
export interface RestaurantExperienceApiPayload {
  readonly experience: RestaurantExperiencePublic;
  readonly contextToken: string;
  readonly hours: readonly RestaurantOperatingHour[];
  readonly serviceability: RestaurantServiceability;
  readonly policies: readonly RestaurantPolicy[];
  readonly highlights: readonly RestaurantHighlight[];
}

export function mapRestaurantPublicToExperience(
  restaurant: RestaurantPublic,
): Pick<
  RestaurantExperiencePublic,
  | 'restaurantId'
  | 'slug'
  | 'displayName'
  | 'coverImage'
  | 'logo'
  | 'rating'
  | 'ratingCount'
  | 'deliveryFee'
  | 'distance'
  | 'eta'
  | 'cuisines'
  | 'veg'
  | 'cloudKitchen'
  | 'openStatus'
  | 'badges'
> {
  const veg =
    restaurant.badges.includes('veg') || restaurant.badges.includes('pure_veg');
  return {
    restaurantId: restaurant.restaurantId,
    slug: restaurant.restaurantSlug,
    displayName: restaurant.displayName,
    coverImage: restaurant.coverUrl,
    logo: restaurant.logoUrl,
    rating: restaurant.rating,
    ratingCount: restaurant.ratingCount,
    deliveryFee: restaurant.deliveryFee,
    distance: restaurant.distanceKm,
    eta: restaurant.etaMinutes,
    cuisines: restaurant.cuisines,
    veg,
    cloudKitchen: restaurant.badges.includes('cloud_kitchen'),
    openStatus: restaurant.isOpen ? 'open' : 'closed',
    badges: restaurant.badges.map(String),
  };
}

export function formatPriceRange(priceForTwo?: number): string | undefined {
  if (priceForTwo == null) return undefined;
  if (priceForTwo < 300) return '₹';
  if (priceForTwo < 500) return '₹₹';
  if (priceForTwo < 800) return '₹₹₹';
  return '₹₹₹₹';
}

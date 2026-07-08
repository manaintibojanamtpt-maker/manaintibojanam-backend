import {
  FOOD_PHOTO_MANIFEST,
  pictureSources,
  resolveFoodPhoto,
  type FoodPhotoAssetId,
  type ResolvedFoodPhoto,
} from '@/features/experience/data/food-photo-manifest';

export type RestaurantSlug =
  | 'mana-inti-kitchen'
  | 'demo-biryani-house'
  | 'demo-dosa-corner'
  | 'demo-cloud-kitchen';

export interface RestaurantGalleryEntry {
  readonly id: string;
  readonly assetId: FoodPhotoAssetId;
  readonly caption: string;
}

export interface RestaurantPhotoSet {
  readonly coverAssetId: FoodPhotoAssetId;
  readonly logoAssetId: FoodPhotoAssetId;
  readonly gallery: readonly RestaurantGalleryEntry[];
}

export const RESTAURANT_PHOTO_SETS: Record<RestaurantSlug, RestaurantPhotoSet> = {
  'mana-inti-kitchen': {
    coverAssetId: 'rest-cover-kitchen',
    logoAssetId: 'rest-kitchen',
    gallery: [
      { id: 'g-kitchen', assetId: 'rest-kitchen', caption: 'Live kitchen' },
      { id: 'g-signature', assetId: 'rest-gallery-signature', caption: 'Signature biryani' },
      { id: 'g-chef', assetId: 'rest-gallery-chef', caption: 'Chef at work' },
      { id: 'g-dining', assetId: 'rest-gallery-dining', caption: 'Dining warmth' },
    ],
  },
  'demo-biryani-house': {
    coverAssetId: 'rest-cover-biryani',
    logoAssetId: 'rest-biryani',
    gallery: [
      { id: 'g-kitchen', assetId: 'rest-kitchen', caption: 'Live kitchen' },
      { id: 'g-signature', assetId: 'rest-cover-biryani', caption: 'Dum biryani' },
      { id: 'g-chef', assetId: 'rest-gallery-chef', caption: 'Chef special' },
      { id: 'g-dining', assetId: 'rest-gallery-dining', caption: 'Packaging area' },
    ],
  },
  'demo-dosa-corner': {
    coverAssetId: 'rest-cover-dosa',
    logoAssetId: 'rest-dosa',
    gallery: [
      { id: 'g-tawa', assetId: 'rest-dosa', caption: 'Crisp dosas' },
      { id: 'g-signature', assetId: 'rest-gallery-signature', caption: 'Filter coffee' },
      { id: 'g-kitchen', assetId: 'rest-kitchen', caption: 'Tawa station' },
    ],
  },
  'demo-cloud-kitchen': {
    coverAssetId: 'rest-cover-thali',
    logoAssetId: 'rest-thali',
    gallery: [
      { id: 'g-kitchen', assetId: 'rest-kitchen', caption: 'Delivery-only kitchen' },
      { id: 'g-meals', assetId: 'rest-thali', caption: 'Meal bowls' },
      { id: 'g-chef', assetId: 'rest-gallery-chef', caption: 'Prep line' },
    ],
  },
};

const DEFAULT_SLUG: RestaurantSlug = 'demo-biryani-house';

export function restaurantSlugFromString(slug: string): RestaurantSlug {
  if (slug in RESTAURANT_PHOTO_SETS) return slug as RestaurantSlug;
  return DEFAULT_SLUG;
}

export function resolveRestaurantCover(slug: string, quality = 88): ResolvedFoodPhoto {
  const set = RESTAURANT_PHOTO_SETS[restaurantSlugFromString(slug)];
  return resolveFoodPhoto(set.coverAssetId, 1600, quality);
}

export function resolveRestaurantLogo(slug: string, quality = 82): ResolvedFoodPhoto {
  const set = RESTAURANT_PHOTO_SETS[restaurantSlugFromString(slug)];
  return resolveFoodPhoto(set.logoAssetId, 128, quality);
}

export function resolveRestaurantGalleryPhoto(assetId: FoodPhotoAssetId, quality = 82): ResolvedFoodPhoto {
  return resolveFoodPhoto(assetId, 640, quality);
}

export function restaurantCoverBaseUrl(slug: string): string {
  const set = RESTAURANT_PHOTO_SETS[restaurantSlugFromString(slug)];
  return FOOD_PHOTO_MANIFEST[set.coverAssetId].baseUrl;
}

export function restaurantLogoBaseUrl(slug: string): string {
  const set = RESTAURANT_PHOTO_SETS[restaurantSlugFromString(slug)];
  return FOOD_PHOTO_MANIFEST[set.logoAssetId].baseUrl;
}

export function buildRestaurantGalleryFromManifest(slug: string) {
  const set = RESTAURANT_PHOTO_SETS[restaurantSlugFromString(slug)];
  return set.gallery.map((entry) => {
    const photo = resolveRestaurantGalleryPhoto(entry.assetId);
    return {
      id: entry.id,
      url: photo.src,
      caption: entry.caption,
      assetId: entry.assetId,
    };
  });
}

export { pictureSources };

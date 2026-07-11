import {
  FOOD_PHOTO_MANIFEST,
  pictureSources,
  resolveFoodPhoto,
  type FoodPhotoAssetId,
  type ResolvedFoodPhoto,
} from '@/features/experience/data/food-photo-manifest';
import type { AppetitePictureSource } from '@/shared/types/media';

export const FOOD_ITEM_PHOTO_ASSETS: Record<string, FoodPhotoAssetId> = {
  food_biryani_chicken: 'dish-biryani-chicken',
  food_biryani_paneer: 'dish-paneer',
  food_kebab: 'dish-kebab',
  food_raita: 'dish-raita',
  food_salan: 'dish-salan',
  food_dessert: 'dish-dessert',
  food_masala_dosa: 'dish-dosa',
  food_idli: 'dish-idli',
  food_filter_coffee: 'dish-coffee',
};

export interface ResolvedFoodItemPhoto {
  src: string;
  srcSet: string;
  sizes: string;
  blurDataURL: string;
  sources: readonly AppetitePictureSource[];
  preloadHref: string;
}

export function resolveFoodItemPhoto(
  foodId: string,
  primaryWidth: number,
  sizes: string,
  quality = 82,
): ResolvedFoodItemPhoto {
  const assetId = FOOD_ITEM_PHOTO_ASSETS[foodId];
  if (!assetId) {
    const fallback = resolveFoodPhoto('hero-biryani', primaryWidth, quality);
    return toItemPhoto(fallback, sizes);
  }
  return toItemPhoto(resolveFoodPhoto(assetId, primaryWidth, quality), sizes);
}

export function foodItemManifestBaseUrl(foodId: string): string {
  const assetId = FOOD_ITEM_PHOTO_ASSETS[foodId] ?? 'hero-biryani';
  return FOOD_PHOTO_MANIFEST[assetId].baseUrl;
}

function toItemPhoto(resolved: ResolvedFoodPhoto, sizes: string): ResolvedFoodItemPhoto {
  return {
    src: resolved.src,
    srcSet: resolved.webpSrcSet,
    sizes,
    blurDataURL: resolved.blurDataURL,
    sources: pictureSources(resolved, sizes),
    preloadHref: resolved.preloadHref,
  };
}

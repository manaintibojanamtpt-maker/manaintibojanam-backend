import {
  foodPhotoFormatSrcSet,
  foodPhotoFormatUrl,
  type FoodPhotoAssetId,
  type FoodPhotoFormat,
  resolveFoodPhoto,
} from '../data/food-photo-manifest';

export { resolveFoodPhoto, foodPhotoFormatUrl, foodPhotoFormatSrcSet };
export type { FoodPhotoAssetId, FoodPhotoFormat };

/** @deprecated Use resolveFoodPhoto from manifest */
export function foodPhotoUrl(base: string, width: number, quality = 80): string {
  return foodPhotoFormatUrl(base, width, 'webp', quality);
}

/** @deprecated Use resolveFoodPhoto from manifest */
export function foodPhotoSrcSet(base: string, widths: readonly number[], quality = 80): string {
  return foodPhotoFormatSrcSet(base, widths, 'webp', quality);
}

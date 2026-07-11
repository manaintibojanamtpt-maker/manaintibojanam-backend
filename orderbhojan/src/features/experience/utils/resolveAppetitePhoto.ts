import {
  pictureSources,
  resolveFoodPhotoByUrl,
  type ResolvedFoodPhoto,
} from '../data/food-photo-manifest';
import type { AppetitePictureSource } from '@/shared/types/media';

export interface AppetitePhotoProps {
  src: string;
  srcSet: string;
  sizes: string;
  blurDataURL: string;
  sources: readonly AppetitePictureSource[];
}

export function resolveAppetitePhoto(
  url: string,
  primaryWidth: number,
  sizes: string,
  quality = 82,
): AppetitePhotoProps {
  const resolved: ResolvedFoodPhoto = resolveFoodPhotoByUrl(url, primaryWidth, quality);
  return {
    src: resolved.src,
    srcSet: resolved.webpSrcSet,
    sizes,
    blurDataURL: resolved.blurDataURL,
    sources: pictureSources(resolved, sizes),
  };
}

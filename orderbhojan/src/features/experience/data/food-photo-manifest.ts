/** Production food photography manifest — WebP / AVIF / BlurHash / responsive widths */
export type FoodPhotoAssetId =
  | 'hero-biryani'
  | 'cat-pizza'
  | 'cat-biryani'
  | 'cat-meals'
  | 'cat-south-indian'
  | 'cat-north-indian'
  | 'rest-kitchen'
  | 'rest-biryani'
  | 'rest-dosa'
  | 'rest-thali'
  | 'rest-cover-kitchen'
  | 'rest-cover-biryani'
  | 'rest-cover-dosa'
  | 'rest-cover-thali'
  | 'rest-gallery-chef'
  | 'rest-gallery-dining'
  | 'rest-gallery-signature'
  | 'dish-paneer'
  | 'dish-pizza'
  | 'dish-biryani-chicken'
  | 'dish-kebab'
  | 'dish-raita'
  | 'dish-salan'
  | 'dish-dessert'
  | 'dish-dosa'
  | 'dish-idli'
  | 'dish-coffee';

export interface FoodPhotoAsset {
  readonly id: FoodPhotoAssetId;
  readonly baseUrl: string;
  readonly blurDataURL: string;
  readonly widths: readonly number[];
}

const WARM_BLUR =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCfAB//2Q==';

export const FOOD_PHOTO_MANIFEST: Record<FoodPhotoAssetId, FoodPhotoAsset> = {
  'hero-biryani': {
    id: 'hero-biryani',
    baseUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
    blurDataURL: WARM_BLUR,
    widths: [640, 960, 1280, 1600, 1920],
  },
  'cat-pizza': {
    id: 'cat-pizza',
    baseUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
    blurDataURL: WARM_BLUR,
    widths: [96, 144, 192],
  },
  'cat-biryani': {
    id: 'cat-biryani',
    baseUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
    blurDataURL: WARM_BLUR,
    widths: [96, 144, 192],
  },
  'cat-meals': {
    id: 'cat-meals',
    baseUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
    blurDataURL: WARM_BLUR,
    widths: [96, 144, 192],
  },
  'cat-south-indian': {
    id: 'cat-south-indian',
    baseUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950',
    blurDataURL: WARM_BLUR,
    widths: [96, 144, 192],
  },
  'cat-north-indian': {
    id: 'cat-north-indian',
    baseUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398',
    blurDataURL: WARM_BLUR,
    widths: [96, 144, 192],
  },
  'rest-kitchen': {
    id: 'rest-kitchen',
    baseUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
  'rest-biryani': {
    id: 'rest-biryani',
    baseUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
  'rest-dosa': {
    id: 'rest-dosa',
    baseUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
  'rest-thali': {
    id: 'rest-thali',
    baseUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
  'rest-cover-kitchen': {
    id: 'rest-cover-kitchen',
    baseUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
    blurDataURL: WARM_BLUR,
    widths: [640, 960, 1280, 1600, 1920],
  },
  'rest-cover-biryani': {
    id: 'rest-cover-biryani',
    baseUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b',
    blurDataURL: WARM_BLUR,
    widths: [640, 960, 1280, 1600, 1920],
  },
  'rest-cover-dosa': {
    id: 'rest-cover-dosa',
    baseUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950',
    blurDataURL: WARM_BLUR,
    widths: [640, 960, 1280, 1600, 1920],
  },
  'rest-cover-thali': {
    id: 'rest-cover-thali',
    baseUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
    blurDataURL: WARM_BLUR,
    widths: [640, 960, 1280, 1600, 1920],
  },
  'rest-gallery-chef': {
    id: 'rest-gallery-chef',
    baseUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640, 960],
  },
  'rest-gallery-dining': {
    id: 'rest-gallery-dining',
    baseUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640, 960],
  },
  'rest-gallery-signature': {
    id: 'rest-gallery-signature',
    baseUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640, 960],
  },
  'dish-paneer': {
    id: 'dish-paneer',
    baseUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
  'dish-pizza': {
    id: 'dish-pizza',
    baseUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
  'dish-biryani-chicken': {
    id: 'dish-biryani-chicken',
    baseUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640, 960],
  },
  'dish-kebab': {
    id: 'dish-kebab',
    baseUrl: 'https://images.unsplash.com/photo-1555936289-7d62f8b7d2d1',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
  'dish-raita': {
    id: 'dish-raita',
    baseUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
  'dish-salan': {
    id: 'dish-salan',
    baseUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
  'dish-dessert': {
    id: 'dish-dessert',
    baseUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
  'dish-dosa': {
    id: 'dish-dosa',
    baseUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640, 960],
  },
  'dish-idli': {
    id: 'dish-idli',
    baseUrl: 'https://images.unsplash.com/photo-1589301778047-568581592785',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
  'dish-coffee': {
    id: 'dish-coffee',
    baseUrl: 'https://images.unsplash.com/photo-1495474472287-4d89bcf63ffc',
    blurDataURL: WARM_BLUR,
    widths: [320, 480, 640],
  },
};

export type FoodPhotoFormat = 'jpg' | 'webp' | 'avif';

export function foodPhotoFormatUrl(
  baseUrl: string,
  width: number,
  format: FoodPhotoFormat,
  quality = 82,
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('w', String(width));
  url.searchParams.set('q', String(quality));
  url.searchParams.set('fit', 'crop');
  url.searchParams.set('auto', format === 'jpg' ? 'format' : 'format');
  if (format === 'webp') url.searchParams.set('fm', 'webp');
  if (format === 'avif') url.searchParams.set('fm', 'avif');
  return url.toString();
}

export function foodPhotoFormatSrcSet(
  baseUrl: string,
  widths: readonly number[],
  format: FoodPhotoFormat,
  quality = 82,
): string {
  return widths.map((w) => `${foodPhotoFormatUrl(baseUrl, w, format, quality)} ${w}w`).join(', ');
}

export interface ResolvedFoodPhoto {
  src: string;
  webpSrcSet: string;
  avifSrcSet: string;
  blurDataURL: string;
  preloadHref: string;
  widths: readonly number[];
}

export function resolveFoodPhoto(assetId: FoodPhotoAssetId, primaryWidth: number, quality = 82): ResolvedFoodPhoto {
  const asset = FOOD_PHOTO_MANIFEST[assetId];
  return {
    src: foodPhotoFormatUrl(asset.baseUrl, primaryWidth, 'webp', quality),
    webpSrcSet: foodPhotoFormatSrcSet(asset.baseUrl, asset.widths, 'webp', quality),
    avifSrcSet: foodPhotoFormatSrcSet(asset.baseUrl, asset.widths, 'avif', quality),
    blurDataURL: asset.blurDataURL,
    preloadHref: foodPhotoFormatUrl(asset.baseUrl, primaryWidth, 'webp', quality),
    widths: asset.widths,
  };
}

export function resolveFoodPhotoByUrl(url: string, primaryWidth: number, quality = 82): ResolvedFoodPhoto {
  const normalized = url.split('?')[0];
  const asset = Object.values(FOOD_PHOTO_MANIFEST).find(
    (entry) => normalized === entry.baseUrl || normalized.includes(entry.baseUrl.split('/').pop() ?? ''),
  );
  if (asset) return resolveFoodPhoto(asset.id, primaryWidth, quality);

  const widths = [320, 480, 640] as const;
  return {
    src: foodPhotoFormatUrl(normalized, primaryWidth, 'webp', quality),
    webpSrcSet: foodPhotoFormatSrcSet(normalized, widths, 'webp', quality),
    avifSrcSet: foodPhotoFormatSrcSet(normalized, widths, 'avif', quality),
    blurDataURL: WARM_BLUR,
    preloadHref: foodPhotoFormatUrl(normalized, 640, 'webp', quality),
    widths,
  };
}

export function pictureSources(resolved: ResolvedFoodPhoto, sizes: string) {
  return [
    { type: 'image/avif', srcSet: resolved.avifSrcSet, sizes },
    { type: 'image/webp', srcSet: resolved.webpSrcSet, sizes },
  ] as const;
}

export const HOME_CATEGORY_PHOTO_ASSETS: Record<
  'pizza' | 'biryani' | 'meals' | 'south-indian' | 'north-indian',
  FoodPhotoAssetId
> = {
  pizza: 'cat-pizza',
  biryani: 'cat-biryani',
  meals: 'cat-meals',
  'south-indian': 'cat-south-indian',
  'north-indian': 'cat-north-indian',
};

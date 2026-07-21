/** Production food photography manifest — WebP / AVIF / BlurHash / responsive widths */
export type FoodPhotoAssetId =
  | 'hero-biryani'
  | 'hero-thali'
  | 'hero-tiffin'
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
  /** Local/static fallback when remote CDN fails */
  readonly fallbackBaseUrl?: string;
  /** Hero banner tuning — HD crop focal point + quality */
  readonly hero?: {
    readonly focalY?: number;
    readonly quality?: number;
  };
}

const WARM_BLUR =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCfAB//2Q==';

/** Responsive widths for full-bleed hero carousel (covers 2x–3x DPR on desktop) */
export const HERO_PHOTO_WIDTHS = [960, 1280, 1600, 1920, 2560, 3200, 3840] as const;

export const HERO_PRIMARY_WIDTH = 3200;
export const HERO_PRIMARY_QUALITY = 92;

const DEFAULT_THUMB_WIDTHS = [320, 480, 640] as const;

/** Unsplash CDN supports width/quality transforms; local & third-party URLs are served as-is */
function isUnsplashPhotoUrl(baseUrl: string): boolean {
  return baseUrl.includes('images.unsplash.com');
}

function inferRemoteImageWidth(url: string): number | undefined {
  const placehold = url.match(/placehold\.co\/(\d+)x(\d+)/i);
  if (placehold) return Number(placehold[1]);

  const picsum = url.match(/picsum\.photos\/(\d+)\/(\d+)/i);
  if (picsum) return Number(picsum[1]);

  if (url.includes('platform-hero')) return HERO_PRIMARY_WIDTH;
  if (url.startsWith('/hero/')) return 1920;

  return undefined;
}

/** Upscale known placeholder hosts so hero never stretches low-res mock assets */
function upgradeHeroImageUrl(url: string, targetWidth: number): string {
  const placehold = url.match(/^(https?:\/\/placehold\.co\/)(\d+)x(\d+)(\/.*)?$/i);
  if (placehold) {
    const currentWidth = Number(placehold[2]);
    if (currentWidth >= targetWidth) return url;
    const aspect = Number(placehold[2]) / Number(placehold[3]);
    const height = Math.max(1, Math.round(targetWidth / aspect));
    return `${placehold[1]}${targetWidth}x${height}${placehold[4] ?? ''}`;
  }
  return url;
}

function resolveStaticPhoto(asset: FoodPhotoAsset): ResolvedFoodPhoto {
  const src = asset.baseUrl;
  return {
    src,
    webpSrcSet: '',
    avifSrcSet: '',
    blurDataURL: asset.blurDataURL,
    preloadHref: src,
    widths: asset.widths,
  };
}

export const FOOD_PHOTO_MANIFEST: Record<FoodPhotoAssetId, FoodPhotoAsset> = {
  'hero-biryani': {
    id: 'hero-biryani',
    baseUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
    blurDataURL: WARM_BLUR,
    widths: HERO_PHOTO_WIDTHS,
    hero: { quality: 94, focalY: 0.42 },
  },
  'hero-thali': {
    id: 'hero-thali',
    baseUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
    blurDataURL: WARM_BLUR,
    widths: HERO_PHOTO_WIDTHS,
    hero: { quality: 94, focalY: 0.48 },
  },
  'hero-tiffin': {
    id: 'hero-tiffin',
    baseUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950',
    blurDataURL: WARM_BLUR,
    widths: HERO_PHOTO_WIDTHS,
    hero: { quality: 94, focalY: 0.44 },
  },
  'cat-pizza': {
    id: 'cat-pizza',
    baseUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
    fallbackBaseUrl: '/categories/pizza.jpg',
    blurDataURL: WARM_BLUR,
    widths: [96, 144, 192],
  },
  'cat-biryani': {
    id: 'cat-biryani',
    baseUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
    fallbackBaseUrl: '/categories/biryani.jpg',
    blurDataURL: WARM_BLUR,
    widths: [96, 144, 192],
  },
  'cat-meals': {
    id: 'cat-meals',
    baseUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
    fallbackBaseUrl: '/categories/meals.jpg',
    blurDataURL: WARM_BLUR,
    widths: [96, 144, 192],
  },
  'cat-south-indian': {
    id: 'cat-south-indian',
    baseUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950',
    fallbackBaseUrl: '/categories/south-indian.jpg',
    blurDataURL: WARM_BLUR,
    widths: [96, 144, 192],
  },
  'cat-north-indian': {
    id: 'cat-north-indian',
    baseUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
    fallbackBaseUrl: '/categories/north-indian.jpg',
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

export interface FoodPhotoCropOptions {
  readonly focalX?: number;
  readonly focalY?: number;
  /** Match wide hero viewport (~2.2:1) so Unsplash crop retains sharp pixels */
  readonly heroBanner?: boolean;
}

export function foodPhotoFormatUrl(
  baseUrl: string,
  width: number,
  format: FoodPhotoFormat,
  quality = 82,
  crop?: FoodPhotoCropOptions,
): string {
  if (!isUnsplashPhotoUrl(baseUrl)) {
    return baseUrl;
  }
  const url = new URL(baseUrl);
  url.searchParams.set('w', String(width));
  url.searchParams.set('q', String(quality));
  url.searchParams.set('fit', 'crop');
  url.searchParams.set('auto', 'format');
  if (crop?.heroBanner && width >= 1280) {
    url.searchParams.set('h', String(Math.round(width * 0.52)));
  }
  if (crop?.focalY != null) {
    url.searchParams.set('crop', 'focalpoint');
    url.searchParams.set('fp-x', String(crop.focalX ?? 0.5));
    url.searchParams.set('fp-y', String(crop.focalY));
  }
  if (format === 'webp') url.searchParams.set('fm', 'webp');
  if (format === 'avif') url.searchParams.set('fm', 'avif');
  return url.toString();
}

export function foodPhotoFormatSrcSet(
  baseUrl: string,
  widths: readonly number[],
  format: FoodPhotoFormat,
  quality = 82,
  crop?: FoodPhotoCropOptions,
): string {
  if (!isUnsplashPhotoUrl(baseUrl)) {
    const upgraded = upgradeHeroImageUrl(baseUrl, widths[widths.length - 1] ?? 1200);
    const intrinsic = inferRemoteImageWidth(upgraded) ?? inferRemoteImageWidth(baseUrl);
    const descriptor = intrinsic ?? widths[widths.length - 1] ?? 1200;
    return `${upgraded} ${descriptor}w`;
  }
  return widths.map((w) => `${foodPhotoFormatUrl(baseUrl, w, format, quality, crop)} ${w}w`).join(', ');
}

export interface ResolvedFoodPhoto {
  src: string;
  webpSrcSet: string;
  avifSrcSet: string;
  blurDataURL: string;
  preloadHref: string;
  widths: readonly number[];
  fallbackSrc?: string;
}

export function resolveCategoryChipPhoto(assetId: FoodPhotoAssetId, primaryWidth = 144, quality = 80): ResolvedFoodPhoto {
  const resolved = resolveFoodPhoto(assetId, primaryWidth, quality);
  const asset = FOOD_PHOTO_MANIFEST[assetId];
  if (!asset.fallbackBaseUrl) return resolved;
  return {
    ...resolved,
    fallbackSrc: asset.fallbackBaseUrl,
  };
}

export function resolveFoodPhoto(assetId: FoodPhotoAssetId, primaryWidth: number, quality = 82): ResolvedFoodPhoto {
  const asset = FOOD_PHOTO_MANIFEST[assetId];
  if (!isUnsplashPhotoUrl(asset.baseUrl)) {
    return resolveStaticPhoto(asset);
  }
  const resolvedQuality = asset.hero?.quality ?? quality;
  const isHeroAsset = asset.widths === HERO_PHOTO_WIDTHS;
  const crop =
    asset.hero?.focalY != null
      ? { focalY: asset.hero.focalY, heroBanner: isHeroAsset }
      : isHeroAsset
        ? { heroBanner: true }
        : undefined;
  return {
    src: foodPhotoFormatUrl(asset.baseUrl, primaryWidth, 'webp', resolvedQuality, crop),
    webpSrcSet: foodPhotoFormatSrcSet(asset.baseUrl, asset.widths, 'webp', resolvedQuality, crop),
    avifSrcSet: foodPhotoFormatSrcSet(asset.baseUrl, asset.widths, 'avif', resolvedQuality, crop),
    blurDataURL: asset.blurDataURL,
    preloadHref: foodPhotoFormatUrl(asset.baseUrl, primaryWidth, 'webp', resolvedQuality, crop),
    widths: asset.widths,
  };
}

function resolveWidthsForUrl(url: string, primaryWidth: number): readonly number[] {
  if (isUnsplashPhotoUrl(url)) {
    return primaryWidth >= 1280 ? HERO_PHOTO_WIDTHS : DEFAULT_THUMB_WIDTHS;
  }
  return primaryWidth >= 1280 ? HERO_PHOTO_WIDTHS : DEFAULT_THUMB_WIDTHS;
}

export function resolveFoodPhotoByUrl(url: string, primaryWidth: number, quality = 82): ResolvedFoodPhoto {
  const normalized = url.split('?')[0];
  const asset = Object.values(FOOD_PHOTO_MANIFEST).find(
    (entry) =>
      normalized === entry.baseUrl ||
      (entry.fallbackBaseUrl != null && normalized === entry.fallbackBaseUrl) ||
      normalized.includes(entry.baseUrl.split('/').pop() ?? ''),
  );
  if (asset) return resolveFoodPhoto(asset.id, primaryWidth, quality);

  const widths = resolveWidthsForUrl(normalized, primaryWidth);
  const resolvedQuality = primaryWidth >= 1280 ? Math.max(quality, HERO_PRIMARY_QUALITY) : quality;
  const heroCrop = primaryWidth >= 1280 ? { heroBanner: true as const } : undefined;
  const upgradedUrl = upgradeHeroImageUrl(normalized, primaryWidth);
  return {
    src: foodPhotoFormatUrl(upgradedUrl, primaryWidth, 'webp', resolvedQuality, heroCrop),
    webpSrcSet: foodPhotoFormatSrcSet(upgradedUrl, widths, 'webp', resolvedQuality, heroCrop),
    avifSrcSet: foodPhotoFormatSrcSet(upgradedUrl, widths, 'avif', resolvedQuality, heroCrop),
    blurDataURL: WARM_BLUR,
    preloadHref: foodPhotoFormatUrl(
      upgradedUrl,
      isUnsplashPhotoUrl(upgradedUrl) ? primaryWidth : inferRemoteImageWidth(upgradedUrl) ?? primaryWidth,
      'webp',
      resolvedQuality,
      heroCrop,
    ),
    widths,
  };
}

export function resolveHeroFoodPhoto(assetId: FoodPhotoAssetId): ResolvedFoodPhoto {
  return resolveFoodPhoto(assetId, HERO_PRIMARY_WIDTH, HERO_PRIMARY_QUALITY);
}

export function resolveHeroFoodPhotoByUrl(url: string): ResolvedFoodPhoto {
  return resolveFoodPhotoByUrl(url, HERO_PRIMARY_WIDTH, HERO_PRIMARY_QUALITY);
}

export function pictureSources(resolved: ResolvedFoodPhoto, sizes: string) {
  const sources: Array<{ type: string; srcSet: string; sizes: string }> = [];
  if (resolved.avifSrcSet) {
    sources.push({ type: 'image/avif', srcSet: resolved.avifSrcSet, sizes });
  }
  if (resolved.webpSrcSet) {
    sources.push({ type: 'image/webp', srcSet: resolved.webpSrcSet, sizes });
  }
  return sources;
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

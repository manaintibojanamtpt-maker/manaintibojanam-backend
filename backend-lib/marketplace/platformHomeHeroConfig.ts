import type { Firestore } from 'firebase-admin/firestore';

const PLATFORM_HOME_HERO_DOC = 'platformSettings/orderbhojanHomeHero';

const ALLOWED_ASSET_IDS = new Set([
  'hero-biryani',
  'hero-thali',
  'hero-tiffin',
  'cat-pizza',
  'cat-biryani',
  'cat-meals',
  'cat-south-indian',
  'cat-north-indian',
]);

export interface PlatformHomeHeroSlide {
  readonly id: string;
  readonly kind?: 'food' | 'offer';
  readonly headline?: string;
  readonly subline: string;
  readonly imageAlt: string;
  readonly imageUrl?: string;
  readonly assetId?: string;
  readonly cta?: string;
  readonly ctaPath?: string;
  readonly offerBadge?: string;
  readonly restaurantName?: string;
  readonly restaurantSlug?: string;
}

export interface PlatformHomeHeroConfig {
  readonly eyebrow: string;
  readonly headline: string;
  readonly rotationIntervalMs: number;
  readonly slides: readonly PlatformHomeHeroSlide[];
  readonly includeDiscoveryOffers?: boolean;
  readonly maxOfferSlides?: number;
  readonly updatedAt?: string;
  readonly updatedBy?: string;
}

export const DEFAULT_PLATFORM_HOME_HERO: PlatformHomeHeroConfig = {
  eyebrow: 'Home kitchens · delivered hot',
  headline: 'What are you craving tonight?',
  rotationIntervalMs: 12_000,
  includeDiscoveryOffers: true,
  maxOfferSlides: 2,
  slides: [
    {
      id: 'biryani',
      kind: 'food',
      assetId: 'hero-biryani',
      imageAlt: 'Steaming chicken biryani with saffron rice',
      headline: 'Biryani that hits different',
      subline: 'Dum-sealed Hyderabadi biryani — hot, fragrant, at your door',
      cta: 'Order biryani',
      ctaPath: '/search?q=biryani',
    },
    {
      id: 'thali',
      kind: 'food',
      assetId: 'hero-thali',
      imageAlt: 'Fresh vegetarian thali with dal, vegetables, and roti',
      headline: 'A full thali, delivered fresh',
      subline: 'Homestyle thali trays — balanced, fresh, made to order',
      cta: 'Browse meals',
      ctaPath: '/search?q=meals',
    },
    {
      id: 'tiffin',
      kind: 'food',
      assetId: 'hero-tiffin',
      imageAlt: 'Crisp dosa with chutney on a brass plate',
      headline: 'South Indian mornings',
      subline: 'Crisp dosas & filter coffee — South Indian breakfast, delivered',
      cta: 'Explore tiffins',
      ctaPath: '/search?q=dosa',
    },
  ],
};

function assertSafeHeroImageUrl(url: unknown, label: string): string | undefined {
  if (url === undefined || url === null || url === '') return undefined;
  if (typeof url !== 'string') {
    throw new Error(`${label} must be a URL string.`);
  }
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:')) {
    throw new Error(`${label} must be a public image URL, not inline data.`);
  }
  if (
    !/^https?:\/\//i.test(trimmed) &&
    !trimmed.startsWith('/api/marketplace/media/') &&
    !trimmed.startsWith('/hero/')
  ) {
    throw new Error(`${label} must be an https URL or approved app path.`);
  }
  return trimmed;
}

function sanitizeSlide(raw: unknown, index: number): PlatformHomeHeroSlide {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Slide ${index + 1} must be an object.`);
  }
  const slide = raw as Record<string, unknown>;
  const id = typeof slide.id === 'string' ? slide.id.trim() : '';
  const subline = typeof slide.subline === 'string' ? slide.subline.trim() : '';
  const imageAlt = typeof slide.imageAlt === 'string' ? slide.imageAlt.trim() : '';
  if (!id) throw new Error(`Slide ${index + 1} requires id.`);
  if (!subline) throw new Error(`Slide ${index + 1} requires subline.`);
  if (!imageAlt) throw new Error(`Slide ${index + 1} requires imageAlt.`);

  const imageUrl = assertSafeHeroImageUrl(slide.imageUrl, `Slide ${index + 1} imageUrl`);
  const assetIdRaw = typeof slide.assetId === 'string' ? slide.assetId.trim() : '';
  const assetId = assetIdRaw && ALLOWED_ASSET_IDS.has(assetIdRaw) ? assetIdRaw : undefined;
  if (!imageUrl && !assetId) {
    throw new Error(`Slide ${index + 1} requires imageUrl or a supported assetId.`);
  }

  const headline = typeof slide.headline === 'string' ? slide.headline.trim() : undefined;
  const cta = typeof slide.cta === 'string' ? slide.cta.trim() : undefined;
  const ctaPathRaw = typeof slide.ctaPath === 'string' ? slide.ctaPath.trim() : undefined;
  const ctaPath =
    ctaPathRaw && ctaPathRaw.startsWith('/') && !ctaPathRaw.startsWith('//') ? ctaPathRaw : undefined;
  const kindRaw = typeof slide.kind === 'string' ? slide.kind.trim() : '';
  const kind = kindRaw === 'offer' ? 'offer' : kindRaw === 'food' ? 'food' : undefined;
  const offerBadge = typeof slide.offerBadge === 'string' ? slide.offerBadge.trim() : undefined;
  const restaurantName = typeof slide.restaurantName === 'string' ? slide.restaurantName.trim() : undefined;
  const restaurantSlugRaw = typeof slide.restaurantSlug === 'string' ? slide.restaurantSlug.trim() : undefined;
  const restaurantSlug =
    restaurantSlugRaw && /^[a-z0-9-]+$/.test(restaurantSlugRaw) ? restaurantSlugRaw : undefined;

  return {
    id,
    subline,
    imageAlt,
    ...(headline ? { headline } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(assetId ? { assetId } : {}),
    ...(cta ? { cta } : {}),
    ...(ctaPath ? { ctaPath } : {}),
    ...(kind ? { kind } : {}),
    ...(offerBadge ? { offerBadge } : {}),
    ...(restaurantName ? { restaurantName } : {}),
    ...(restaurantSlug ? { restaurantSlug } : {}),
  };
}

export function sanitizePlatformHomeHeroConfig(raw: unknown): PlatformHomeHeroConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Home hero config must be an object.');
  }
  const input = raw as Record<string, unknown>;
  const eyebrow =
    typeof input.eyebrow === 'string' && input.eyebrow.trim()
      ? input.eyebrow.trim()
      : DEFAULT_PLATFORM_HOME_HERO.eyebrow;
  const headline =
    typeof input.headline === 'string' && input.headline.trim()
      ? input.headline.trim()
      : DEFAULT_PLATFORM_HOME_HERO.headline;

  const rotationIntervalMsRaw = Number(input.rotationIntervalMs);
  const rotationIntervalMs =
    Number.isFinite(rotationIntervalMsRaw) && rotationIntervalMsRaw >= 5_000 && rotationIntervalMsRaw <= 30_000
      ? Math.round(rotationIntervalMsRaw)
      : DEFAULT_PLATFORM_HOME_HERO.rotationIntervalMs;

  if (!Array.isArray(input.slides) || input.slides.length === 0) {
    throw new Error('At least one slide is required.');
  }
  if (input.slides.length > 6) {
    throw new Error('No more than six slides are allowed.');
  }

  const slides = input.slides.map((slide, index) => sanitizeSlide(slide, index));
  const ids = new Set(slides.map((slide) => slide.id));
  if (ids.size !== slides.length) {
    throw new Error('Slide ids must be unique.');
  }

  const includeDiscoveryOffers =
    input.includeDiscoveryOffers === undefined ? true : Boolean(input.includeDiscoveryOffers);
  const maxOfferSlidesRaw = Number(input.maxOfferSlides);
  const maxOfferSlides =
    Number.isFinite(maxOfferSlidesRaw) && maxOfferSlidesRaw >= 0 && maxOfferSlidesRaw <= 4
      ? Math.round(maxOfferSlidesRaw)
      : DEFAULT_PLATFORM_HOME_HERO.maxOfferSlides ?? 2;

  return {
    eyebrow,
    headline,
    rotationIntervalMs,
    slides,
    includeDiscoveryOffers,
    maxOfferSlides,
  };
}

export function mergePlatformHomeHeroConfig(raw: unknown): PlatformHomeHeroConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_PLATFORM_HOME_HERO;
  }
  try {
    return sanitizePlatformHomeHeroConfig(raw);
  } catch {
    return DEFAULT_PLATFORM_HOME_HERO;
  }
}

export async function readPlatformHomeHeroConfig(db: Firestore): Promise<PlatformHomeHeroConfig> {
  try {
    const doc = await db.doc(PLATFORM_HOME_HERO_DOC).get();
    if (!doc.exists) return DEFAULT_PLATFORM_HOME_HERO;
    return mergePlatformHomeHeroConfig(doc.data());
  } catch {
    return DEFAULT_PLATFORM_HOME_HERO;
  }
}

export async function writePlatformHomeHeroConfig(
  db: Firestore,
  raw: unknown,
  updatedBy: string,
  fieldValue: { serverTimestamp: () => unknown },
): Promise<PlatformHomeHeroConfig> {
  const config = sanitizePlatformHomeHeroConfig(raw);
  await db.doc(PLATFORM_HOME_HERO_DOC).set(
    {
      ...config,
      updatedBy,
      updatedAt: fieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return config;
}

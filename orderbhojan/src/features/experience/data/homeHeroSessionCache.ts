import type { HomeHeroConfig, HomeHeroSlide } from '@/types/marketplace-home-hero';

const STORAGE_KEY = 'ob-home-hero-v1';
/** Keep last-known superadmin hero across opens so we never flash DEFAULT assets. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60_000;

export type HomeHeroSessionCache = {
  readonly config: HomeHeroConfig;
  readonly fetchedAt: number;
};

function isSlide(raw: unknown): raw is HomeHeroSlide {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const slide = raw as Record<string, unknown>;
  return (
    typeof slide.id === 'string' &&
    slide.id.trim().length > 0 &&
    typeof slide.subline === 'string' &&
    typeof slide.imageAlt === 'string' &&
    (typeof slide.imageUrl === 'string' || typeof slide.assetId === 'string')
  );
}

function sanitizeConfig(raw: unknown): HomeHeroConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  if (!Array.isArray(input.slides) || input.slides.length === 0) return null;
  const slides = input.slides.filter(isSlide);
  if (slides.length === 0) return null;

  const rotationIntervalMsRaw = Number(input.rotationIntervalMs);
  const rotationIntervalMs =
    Number.isFinite(rotationIntervalMsRaw) && rotationIntervalMsRaw >= 5_000
      ? Math.round(rotationIntervalMsRaw)
      : 12_000;

  return {
    eyebrow: typeof input.eyebrow === 'string' ? input.eyebrow : '',
    headline: typeof input.headline === 'string' ? input.headline : '',
    rotationIntervalMs,
    slides,
    includeDiscoveryOffers:
      input.includeDiscoveryOffers === undefined ? true : Boolean(input.includeDiscoveryOffers),
    maxOfferSlides:
      typeof input.maxOfferSlides === 'number' && Number.isFinite(input.maxOfferSlides)
        ? Math.max(0, Math.min(4, Math.round(input.maxOfferSlides)))
        : 2,
    ...(typeof input.updatedAt === 'string' ? { updatedAt: input.updatedAt } : {}),
    ...(typeof input.updatedBy === 'string' ? { updatedBy: input.updatedBy } : {}),
  };
}

export function readHomeHeroSessionCache(): HomeHeroSessionCache | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { config?: unknown; fetchedAt?: unknown };
    const fetchedAt = typeof parsed.fetchedAt === 'number' ? parsed.fetchedAt : 0;
    if (!fetchedAt || Date.now() - fetchedAt > SESSION_TTL_MS) return null;
    const config = sanitizeConfig(parsed.config);
    if (!config) return null;
    return { config, fetchedAt };
  } catch {
    return null;
  }
}

export function writeHomeHeroSessionCache(config: HomeHeroConfig, fetchedAt = Date.now()): void {
  if (typeof localStorage === 'undefined') return;
  const sanitized = sanitizeConfig(config);
  if (!sanitized) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ config: sanitized, fetchedAt } satisfies HomeHeroSessionCache),
    );
  } catch {
    /* quota / private mode — ignore */
  }
}

export function seedHomeHeroQueryCacheFromSession(
  setQueryData: (
    key: readonly unknown[],
    data: HomeHeroConfig,
    options?: { updatedAt?: number },
  ) => void,
  queryKey: readonly unknown[],
): boolean {
  const cached = readHomeHeroSessionCache();
  if (!cached) return false;
  setQueryData(queryKey, cached.config, { updatedAt: cached.fetchedAt });
  return true;
}

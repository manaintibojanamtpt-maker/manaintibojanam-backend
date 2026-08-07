import { useQuery } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { DEFAULT_HOME_HERO_CONFIG } from '@/features/experience/data/kitchenHeroScenes';
import {
  readHomeHeroSessionCache,
  writeHomeHeroSessionCache,
} from '@/features/experience/data/homeHeroSessionCache';
import type { HomeHeroConfig } from '@/types/marketplace-home-hero';

/** Background refresh window — UI keeps last-known hero until the new payload arrives. */
const HOME_HERO_STALE_MS = 5 * 60 * 1000;

export function homeHeroQueryKey() {
  return ['marketplace', 'platform', 'home-hero'] as const;
}

function resolveSeed(): { config: HomeHeroConfig; updatedAt: number; fromCache: boolean } {
  const cached = readHomeHeroSessionCache();
  if (cached) {
    return { config: cached.config, updatedAt: cached.fetchedAt, fromCache: true };
  }
  return { config: DEFAULT_HOME_HERO_CONFIG, updatedAt: 0, fromCache: false };
}

function hasUsableHeroSlides(config: HomeHeroConfig | null | undefined): boolean {
  return Boolean(config?.slides?.some((slide) => Boolean(slide?.id?.trim())));
}

export function useHomeHeroConfig() {
  const seed = resolveSeed();

  return useQuery({
    queryKey: homeHeroQueryKey(),
    queryFn: async (): Promise<HomeHeroConfig> => {
      try {
        const config = await getMarketplaceApiClient().homeHero();
        if (!hasUsableHeroSlides(config)) {
          if (import.meta.env?.DEV) {
            console.warn('[home-hero] API returned empty slides; keeping last-known / defaults');
          }
          return seed.config;
        }
        writeHomeHeroSessionCache(config);
        return config;
      } catch {
        return seed.config;
      }
    },
    // Prefer last live superadmin hero from localStorage so reopen never flashes DEFAULT assets.
    initialData: seed.config,
    initialDataUpdatedAt: seed.updatedAt,
    staleTime: HOME_HERO_STALE_MS,
    gcTime: HOME_HERO_STALE_MS * 4,
    refetchOnWindowFocus: true,
  });
}

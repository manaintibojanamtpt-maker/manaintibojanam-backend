import { useQuery } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { DEFAULT_HOME_HERO_CONFIG } from '@/features/experience/data/kitchenHeroScenes';
import type { HomeHeroConfig } from '@/types/marketplace-home-hero';

/** Short enough that superadmin hero edits show up without a hard refresh. */
const HOME_HERO_STALE_MS = 60 * 1000;

export function homeHeroQueryKey() {
  return ['marketplace', 'platform', 'home-hero'] as const;
}

export function useHomeHeroConfig() {
  return useQuery({
    queryKey: homeHeroQueryKey(),
    queryFn: async (): Promise<HomeHeroConfig> => {
      try {
        return await getMarketplaceApiClient().homeHero();
      } catch {
        return DEFAULT_HOME_HERO_CONFIG;
      }
    },
    // Paint hero immediately from known defaults; refresh in background.
    initialData: DEFAULT_HOME_HERO_CONFIG,
    // Treat seeded defaults as already stale so the first mount always fetches
    // live platformSettings/orderbhojanHomeHero from superadmin.
    initialDataUpdatedAt: 0,
    placeholderData: DEFAULT_HOME_HERO_CONFIG,
    staleTime: HOME_HERO_STALE_MS,
    gcTime: HOME_HERO_STALE_MS * 10,
    refetchOnWindowFocus: true,
  });
}

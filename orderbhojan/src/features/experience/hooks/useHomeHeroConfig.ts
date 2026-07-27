import { useQuery } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { DEFAULT_HOME_HERO_CONFIG } from '@/features/experience/data/kitchenHeroScenes';
import type { HomeHeroConfig } from '@/types/marketplace-home-hero';

const HOME_HERO_STALE_MS = 5 * 60 * 1000;

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
    placeholderData: DEFAULT_HOME_HERO_CONFIG,
    staleTime: HOME_HERO_STALE_MS,
    gcTime: HOME_HERO_STALE_MS * 2,
    refetchOnWindowFocus: false,
  });
}

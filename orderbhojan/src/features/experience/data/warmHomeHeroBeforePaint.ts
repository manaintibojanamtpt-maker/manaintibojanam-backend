import { getMarketplaceApiClient } from '@/marketplace-api';
import { writeHomeHeroSessionCache } from '@/features/experience/data/homeHeroSessionCache';
import { homeHeroQueryKey } from '@/features/experience/hooks/useHomeHeroConfig';
import { queryClient } from '@/shared/queryClient';
import type { HomeHeroConfig } from '@/types/marketplace-home-hero';

const HOME_HERO_STALE_MS = 5 * 60 * 1000;

/**
 * Start (and optionally await briefly) the live home-hero fetch before first paint.
 * Session cache still wins for instant reopen; this cuts the DEFAULT→live flash on cold start
 * when the marketplace responds quickly.
 */
export async function warmHomeHeroBeforePaint(timeoutMs = 400): Promise<void> {
  const fetchPromise = queryClient.fetchQuery({
    queryKey: homeHeroQueryKey(),
    queryFn: async (): Promise<HomeHeroConfig> => {
      const config = await getMarketplaceApiClient().homeHero();
      if (!config?.slides?.some((slide) => Boolean(slide?.id?.trim()))) {
        if (import.meta.env?.DEV) {
          console.warn('[home-hero] warm fetch returned empty slides; skipping cache write');
        }
        throw new Error('home-hero empty slides');
      }
      writeHomeHeroSessionCache(config);
      return config;
    },
    staleTime: HOME_HERO_STALE_MS,
  });

  await Promise.race([
    fetchPromise.then(() => undefined).catch(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

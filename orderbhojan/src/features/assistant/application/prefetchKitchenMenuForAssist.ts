import { getMarketplaceApiClient } from '@/marketplace-api';
import { mergeMenuItemsIntoSearchCache } from '@/features/search/store/searchMenuCacheStore';
import type { SearchResultItem } from '@/types/marketplace-search';
import { resolveRestaurantSlugForApi } from '../domain/restaurantIdSlug';
import { recordVoiceTelemetry } from '../domain/voiceOrderingTelemetry';

const prefetchedSlugs = new Set<string>();

/**
 * Prefetch a kitchen menu into the assist search cache so voice grounding
 * does not treat cold-cache as “unavailable”.
 */
export async function prefetchKitchenMenuForAssist(input: {
  readonly restaurantId?: string | null;
  readonly restaurantSlug?: string | null;
  readonly restaurantName?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly force?: boolean;
}): Promise<number> {
  const slug = resolveRestaurantSlugForApi({
    restaurantId: input.restaurantId,
    restaurantSlug: input.restaurantSlug,
  });
  if (!slug) return 0;
  if (!input.force && prefetchedSlugs.has(slug)) return 0;

  try {
    const lat = typeof input.lat === 'number' ? input.lat : 0;
    const lng = typeof input.lng === 'number' ? input.lng : 0;
    const menu = await getMarketplaceApiClient().foodMenu(slug, { lat, lng });
    const restaurantId =
      input.restaurantId?.trim() ||
      (menu as { restaurantId?: string }).restaurantId ||
      `obr_${slug}`;
    const restaurantName =
      input.restaurantName?.trim() ||
      menu.restaurantName ||
      slug;

    const items: SearchResultItem[] = (menu.items ?? [])
      .filter((item) => item.availability !== false)
      .map((item) => ({
        id: item.foodId,
        type: 'food' as const,
        label: item.name,
        slug: item.slug,
        restaurant: {
          restaurantId,
          restaurantSlug: menu.slug || slug,
          displayName: restaurantName,
          cuisines: [],
          isOpen: true,
          badges: [],
          kitchenFormat: 'cloud_kitchen' as const,
        },
        meta: {
          price: item.offerPrice ?? item.price,
          isVeg: item.dietary === 'veg',
        },
      }));

    if (items.length) {
      mergeMenuItemsIntoSearchCache(items);
      prefetchedSlugs.add(slug);
    }
    return items.length;
  } catch {
    recordVoiceTelemetry('menuItemGroundingFailures');
    return 0;
  }
}

export function resetPrefetchedKitchenMenusForTests(): void {
  prefetchedSlugs.clear();
}

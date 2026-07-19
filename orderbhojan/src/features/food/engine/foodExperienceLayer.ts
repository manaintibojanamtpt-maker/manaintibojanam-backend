import { getFoodApiClient } from '../infrastructure/foodApiClient';
import { isContractMenuPathEnabled } from '../hooks/useContractV1Feature';
import { mapFoodMenuDTOToFoodMenuResponse } from '@/marketplace-api/mappers/v1/foodMenuV1ToLegacy';
import {
  useRestaurantContextStore,
} from '@/features/restaurant/store/restaurantContextStore';
import {
  readFoodSessionCache,
  readFoodSessionContext,
  writeFoodSessionCache,
} from './foodSessionCache';
import type {
  FoodCollectionResponse,
  FoodMenuApiPayload,
  FoodMenuQueryParams,
  FoodMenuResponse,
} from '@/types/marketplace-food';
import type { FoodMenuApiEnvelopeDTO } from '@bhojan/marketplace-contracts';

function persistMenuContext(
  slug: string,
  contextToken: string,
  restaurantId: string,
): void {
  useRestaurantContextStore.getState().setContext({
    restaurantSlug: slug,
    contextToken,
    restaurantId,
  });
}

function menuFallbackRestaurantId(slug: string): string {
  return `obr_${slug}`;
}

/** Restores cart/checkout restaurant context when menu is shown from cache or query data. */
export function syncRestaurantContextFromMenuCache(
  slug: string,
  lat: number,
  lng: number,
  menu?: FoodMenuResponse | null,
): boolean {
  if (!slug) return false;

  const active = useRestaurantContextStore.getState();
  if (
    active.restaurantSlug === slug &&
    active.restaurantId &&
    active.contextToken
  ) {
    return true;
  }

  const cachedContext = readFoodSessionContext(slug, lat, lng);
  if (cachedContext) {
    persistMenuContext(slug, cachedContext.contextToken, cachedContext.restaurantId);
    return true;
  }

  const cachedMenu = menu ?? readFoodSessionCache(slug, lat, lng);
  if (cachedMenu) {
    persistMenuContext(slug, `menu_${slug}`, menuFallbackRestaurantId(slug));
    return true;
  }

  // Route slug is authoritative — allow ADD before menu fetch/cache hydration completes.
  persistMenuContext(slug, `menu_${slug}`, menuFallbackRestaurantId(slug));
  return true;
}

function restaurantIdFromEnvelope(envelope: FoodMenuApiEnvelopeDTO, slug: string): string {
  return envelope.items[0]?.restaurantId ?? slug;
}

export async function loadFoodMenu(params: FoodMenuQueryParams): Promise<FoodMenuResponse> {
  const lat = params.lat ?? 0;
  const lng = params.lng ?? 0;

  const finalize = (
    menu: FoodMenuResponse,
    context: { readonly contextToken: string; readonly restaurantId: string },
  ): FoodMenuResponse => {
    writeFoodSessionCache(params.slug, lat, lng, menu, context);
    return menu;
  };

  if (isContractMenuPathEnabled()) {
    const envelope = await getFoodApiClient().fetchMenuContractV1(params);
    const context = {
      contextToken: envelope.contextToken,
      restaurantId: restaurantIdFromEnvelope(envelope, params.slug),
    };
    persistMenuContext(params.slug, context.contextToken, context.restaurantId);
    const menu = mapFoodMenuDTOToFoodMenuResponse(envelope);
    return finalize(enrichWithRecommendations(enrichWithAiBadges(menu)), context);
  }

  const payload = await getFoodApiClient().fetchMenu(params);
  const context = {
    contextToken: payload.contextToken,
    restaurantId: `obr_${params.slug}`,
  };
  persistMenuContext(params.slug, context.contextToken, context.restaurantId);
  return finalize(
    enrichWithRecommendations(enrichWithAiBadges(stripInternal(payload))),
    context,
  );
}

export async function loadFoodRecommended(slug: string): Promise<FoodCollectionResponse> {
  return getFoodApiClient().fetchRecommended(slug);
}

export async function loadFoodBestsellers(slug: string): Promise<FoodCollectionResponse> {
  return getFoodApiClient().fetchBestsellers(slug);
}

function stripInternal(payload: FoodMenuApiPayload): FoodMenuResponse {
  return {
    slug: payload.slug,
    restaurantName: payload.restaurantName,
    categories: payload.categories,
    items: payload.items,
    featuredIds: payload.featuredIds,
    todaysSpecialIds: payload.todaysSpecialIds,
  };
}

/** Future hook: AI food badges and descriptions. */
export function enrichWithAiBadges(menu: FoodMenuResponse): FoodMenuResponse {
  return menu;
}

/** Future hook: personalized ranking / combos. */
export function enrichWithRecommendations(menu: FoodMenuResponse): FoodMenuResponse {
  return menu;
}

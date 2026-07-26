import { readDiscoverySessionCache } from '@/features/discovery/engine/discoverySessionCache';
import { getCachedMenuItemsForSearch } from '@/features/search/store/searchMenuCacheStore';

export interface OrderingAssistContextPayload {
  readonly restaurantId?: string;
  readonly restaurantName?: string;
  readonly restaurantSlug?: string;
  readonly areaLabel?: string;
  readonly city?: string;
  readonly menuItems?: readonly {
    readonly id?: string;
    readonly name: string;
    readonly price?: number;
    readonly isVeg?: boolean;
  }[];
  readonly nearbyKitchens?: readonly {
    readonly id?: string;
    readonly name: string;
    readonly cuisine?: string;
  }[];
}

function kitchensFromDiscoveryCache(lat?: number | null, lng?: number | null) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return [];
  const feed = readDiscoverySessionCache(lat, lng, {});
  if (!feed?.collections?.length) return [];
  const seen = new Set<string>();
  const kitchens: { id: string; name: string; cuisine?: string }[] = [];
  for (const collection of feed.collections) {
    for (const restaurant of collection.restaurants) {
      if (seen.has(restaurant.restaurantId)) continue;
      seen.add(restaurant.restaurantId);
      kitchens.push({
        id: restaurant.restaurantId,
        name: restaurant.displayName,
        ...(restaurant.cuisines[0] ? { cuisine: restaurant.cuisines[0] } : {}),
      });
      if (kitchens.length >= 20) return kitchens;
    }
  }
  return kitchens;
}

export function buildOrderingAssistContext(params: {
  readonly restaurantId?: string | null;
  readonly restaurantSlug?: string | null;
  readonly restaurantName?: string | null;
  readonly areaLabel?: string | null;
  readonly city?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  /** When set, prefer this kitchen’s menu for grounding (named in utterance). */
  readonly preferRestaurantId?: string | null;
  readonly nearbyKitchens?: readonly {
    readonly id?: string;
    readonly name: string;
    readonly cuisine?: string;
  }[];
}): OrderingAssistContextPayload | null {
  const preferredId = params.preferRestaurantId?.trim() || undefined;
  const restaurantId = preferredId || params.restaurantId?.trim() || undefined;
  const restaurantSlug = preferredId ? undefined : params.restaurantSlug?.trim() || undefined;
  const restaurantName = params.restaurantName?.trim() || undefined;
  const areaLabel = params.areaLabel?.trim() || undefined;
  const city = params.city?.trim() || undefined;

  const cached = getCachedMenuItemsForSearch();
  const menuSource = restaurantId
    ? cached.filter((item) => item.restaurant?.restaurantId === restaurantId)
    : cached;
  const menuItems = menuSource.slice(0, 36).map((item) => {
    const priceRaw = item.meta?.price;
    const price = typeof priceRaw === 'number' ? priceRaw : undefined;
    const vegRaw = item.meta?.isVeg ?? item.meta?.veg;
    const isVeg = typeof vegRaw === 'boolean' ? vegRaw : undefined;
    return {
      id: item.id,
      name: item.label,
      ...(price !== undefined ? { price } : {}),
      ...(isVeg !== undefined ? { isVeg } : {}),
    };
  });

  const fromDiscovery = kitchensFromDiscoveryCache(params.lat, params.lng);
  const nearbySource = params.nearbyKitchens?.length ? params.nearbyKitchens : fromDiscovery;
  const nearbyKitchens = nearbySource.slice(0, 20).map((k) => ({
    ...(k.id ? { id: k.id } : {}),
    name: k.name,
    ...(k.cuisine ? { cuisine: k.cuisine } : {}),
  }));

  if (
    !restaurantId &&
    !restaurantSlug &&
    !restaurantName &&
    !areaLabel &&
    !city &&
    menuItems.length === 0 &&
    nearbyKitchens.length === 0
  ) {
    return null;
  }

  return {
    ...(restaurantId ? { restaurantId } : {}),
    ...(restaurantSlug ? { restaurantSlug } : {}),
    ...(restaurantName ? { restaurantName } : {}),
    ...(areaLabel ? { areaLabel } : {}),
    ...(city ? { city } : {}),
    ...(menuItems.length ? { menuItems } : {}),
    ...(nearbyKitchens.length ? { nearbyKitchens } : {}),
  };
}

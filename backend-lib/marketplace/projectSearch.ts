import type { Firestore } from 'firebase-admin/firestore';
import { classifyTextMatch, normalizeForMatch } from '../shared/serverBundleHelpers.js';
import { loadVisibleDiscoveryProfiles } from './discoveryProfileWriter.js';
import { parseFirestoreMenuItem } from './projectFoodMenuV1.js';
import {
  loadMarketplaceRestaurants,
  type RestaurantPublic,
} from './projectDiscovery.js';

export interface SearchFilters {
  readonly cuisines?: readonly string[];
  readonly vegOnly?: boolean;
  readonly nonVegOnly?: boolean;
  readonly cloudKitchenOnly?: boolean;
  readonly openNowOnly?: boolean;
  readonly offersOnly?: boolean;
  readonly minRating?: number;
  readonly maxDistanceKm?: number;
  readonly maxEtaMinutes?: number;
  readonly maxDeliveryFee?: number;
  readonly priceRange?: 'budget' | 'mid' | 'premium';
  readonly sort?: 'popularity' | 'distance' | 'rating' | 'newest' | 'alphabetical';
}

export interface SearchQueryParams {
  readonly q: string;
  readonly lat: number;
  readonly lng: number;
  readonly limit?: number;
  readonly filters?: SearchFilters;
}

export interface SearchResultItem {
  readonly id: string;
  readonly type:
    | 'restaurant'
    | 'food'
    | 'category'
    | 'collection'
    | 'offer'
    | 'cloud_kitchen'
    | 'brand';
  readonly label: string;
  readonly subtitle?: string;
  readonly imageUrl?: string;
  readonly badge?: string;
  readonly slug?: string;
  readonly restaurant?: RestaurantPublic;
  readonly meta?: Readonly<Record<string, string | number | boolean>>;
}

export interface SearchResultSection {
  readonly id: string;
  readonly title: string;
  readonly type: SearchResultItem['type'];
  readonly items: readonly SearchResultItem[];
  readonly total?: number;
}

export interface SearchPlatformResponse {
  readonly query: string;
  readonly sections: readonly SearchResultSection[];
  readonly meta: {
    readonly provider: string;
    readonly totalResults: number;
    readonly tookMs?: number;
  };
}

export interface SearchSuggestion {
  readonly id: string;
  readonly label: string;
  readonly type: 'query' | 'restaurant' | 'cuisine' | 'food' | 'collection';
  readonly highlight?: string;
}

export interface SearchSuggestionsResponse {
  readonly query: string;
  readonly suggestions: readonly SearchSuggestion[];
}

export interface SearchTermChip {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
}

export interface SearchTrendingResponse {
  readonly trending: readonly SearchTermChip[];
  readonly popular: readonly SearchTermChip[];
}

export interface SearchRecentResponse {
  readonly recent: readonly SearchTermChip[];
}

export interface SearchBrowseItem {
  readonly id: string;
  readonly label: string;
  readonly subtitle?: string;
  readonly emoji?: string;
  readonly query?: string;
}

export interface SearchBrowseSection {
  readonly id: string;
  readonly title: string;
  readonly kind: 'chips' | 'rail' | 'list';
  readonly items: readonly SearchBrowseItem[];
}

export interface SearchCollectionsResponse {
  readonly sections: readonly SearchBrowseSection[];
}

interface SearchMenuItem {
  readonly id: string;
  readonly tenantId: string;
  readonly restaurantSlug: string;
  readonly name: string;
  readonly category: string;
  readonly description?: string;
  readonly image?: string;
  readonly price: number;
  readonly isVeg: boolean;
}

interface SearchContext {
  readonly restaurants: readonly RestaurantPublic[];
  readonly menuItems: readonly SearchMenuItem[];
  readonly poolSyncRevision?: string;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function matchesQuery(text: string, query: string): boolean {
  const normalized = normalizeForMatch(query);
  if (!normalized) return true;
  return classifyTextMatch(normalized, text, 'text').matchType !== 'none';
}

function restaurantToItem(restaurant: RestaurantPublic): SearchResultItem {
  return {
    id: restaurant.restaurantId,
    type: 'restaurant',
    label: restaurant.displayName,
    subtitle: restaurant.cuisines.join(' · '),
    imageUrl: restaurant.coverUrl ?? restaurant.logoUrl,
    slug: restaurant.restaurantSlug,
    restaurant,
    badge: restaurant.badges.includes('offer') ? 'Offer' : undefined,
  };
}

function applySearchFilters(
  restaurants: readonly RestaurantPublic[],
  filters?: SearchFilters,
): RestaurantPublic[] {
  let result = [...restaurants];
  if (!filters) return result;

  if (filters.vegOnly) {
    result = result.filter((r) => r.badges.includes('veg') || r.badges.includes('pure_veg'));
  }
  if (filters.nonVegOnly) {
    result = result.filter((r) => !r.badges.includes('pure_veg'));
  }
  if (filters.cloudKitchenOnly) {
    result = result.filter((r) => r.badges.includes('cloud_kitchen'));
  }
  if (filters.openNowOnly) {
    result = result.filter((r) => r.isOpen);
  }
  if (filters.offersOnly) {
    result = result.filter((r) => r.badges.includes('offer'));
  }
  if (filters.minRating != null) {
    result = result.filter((r) => (r.rating ?? 0) >= filters.minRating!);
  }
  if (filters.maxDistanceKm != null) {
    result = result.filter((r) => (r.distanceKm ?? Infinity) <= filters.maxDistanceKm!);
  }
  if (filters.maxDeliveryFee != null) {
    result = result.filter((r) => (r.deliveryFee ?? 0) <= filters.maxDeliveryFee!);
  }
  if (filters.maxEtaMinutes != null) {
    result = result.filter((r) => (r.etaMinutes?.max ?? 999) <= filters.maxEtaMinutes!);
  }
  if (filters.cuisines?.length) {
    const wanted = new Set(filters.cuisines.map((c) => normalizeForMatch(c)));
    result = result.filter((r) => r.cuisines.some((c) => wanted.has(normalizeForMatch(c))));
  }
  if (filters.priceRange === 'budget') {
    result = result.filter((r) => (r.priceForTwo ?? 999) <= 350);
  }
  if (filters.priceRange === 'mid') {
    result = result.filter((r) => {
      const price = r.priceForTwo ?? 0;
      return price > 350 && price <= 600;
    });
  }
  if (filters.priceRange === 'premium') {
    result = result.filter((r) => (r.priceForTwo ?? 0) > 600);
  }

  return result;
}

function sortRestaurants(
  restaurants: readonly RestaurantPublic[],
  sort: SearchFilters['sort'] = 'popularity',
): RestaurantPublic[] {
  const copy = [...restaurants];
  switch (sort) {
    case 'distance':
      return copy.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    case 'rating':
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'newest':
      return copy.sort((a, b) => Number(b.badges.includes('new')) - Number(a.badges.includes('new')));
    case 'alphabetical':
      return copy.sort((a, b) => a.displayName.localeCompare(b.displayName));
    case 'popularity':
    default:
      return copy.sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
  }
}

async function loadMenuItemsForTenants(
  db: Firestore,
  tenantIds: readonly string[],
  slugByTenantId: ReadonlyMap<string, string>,
): Promise<SearchMenuItem[]> {
  const items: SearchMenuItem[] = [];
  for (const tenantChunk of chunk(tenantIds, 10)) {
    if (tenantChunk.length === 0) continue;
    const snapshot = await db.collection('menu').where('tenantId', 'in', tenantChunk).get();
    for (const doc of snapshot.docs) {
      const parsed = parseFirestoreMenuItem(doc.id, doc.data() as Record<string, unknown>);
      if (!parsed || parsed.isAvailable === false) continue;
      const restaurantSlug = slugByTenantId.get(parsed.tenantId);
      if (!restaurantSlug) continue;
      items.push({
        id: parsed.id,
        tenantId: parsed.tenantId,
        restaurantSlug,
        name: parsed.name,
        category: parsed.category,
        description: parsed.description,
        image: parsed.image,
        price: parsed.price,
        isVeg: parsed.type === 'veg',
      });
    }
  }
  return items;
}

export async function loadSearchContext(
  db: Firestore,
  coords: { lat: number; lng: number },
): Promise<SearchContext> {
  const [{ restaurants, poolSyncRevision }, profiles] = await Promise.all([
    loadMarketplaceRestaurants(db, coords),
    loadVisibleDiscoveryProfiles(db),
  ]);

  const slugByTenantId = new Map<string, string>();
  for (const entry of profiles) {
    slugByTenantId.set(entry.tenantId, entry.profile.slug);
  }

  const tenantIds = restaurants
    .map((restaurant) => {
      for (const [tenantId, slug] of slugByTenantId.entries()) {
        if (slug === restaurant.restaurantSlug) return tenantId;
      }
      return restaurant.restaurantSlug;
    })
    .filter(Boolean);

  const menuItems = await loadMenuItemsForTenants(db, tenantIds, slugByTenantId);
  return { restaurants, menuItems, poolSyncRevision };
}

export function parseSearchQueryParams(url: URL): SearchQueryParams {
  const filters: SearchFilters = {};
  const cuisines = url.searchParams.get('cuisines');
  if (cuisines) filters.cuisines = cuisines.split(',').map((c) => c.trim()).filter(Boolean);
  if (url.searchParams.get('vegOnly') === 'true') filters.vegOnly = true;
  if (url.searchParams.get('nonVegOnly') === 'true') filters.nonVegOnly = true;
  if (url.searchParams.get('cloudKitchenOnly') === 'true') filters.cloudKitchenOnly = true;
  if (url.searchParams.get('openNowOnly') === 'true') filters.openNowOnly = true;
  if (url.searchParams.get('offersOnly') === 'true') filters.offersOnly = true;
  const minRating = url.searchParams.get('minRating');
  if (minRating) filters.minRating = Number(minRating);
  const maxDistanceKm = url.searchParams.get('maxDistanceKm');
  if (maxDistanceKm) filters.maxDistanceKm = Number(maxDistanceKm);
  const maxEtaMinutes = url.searchParams.get('maxEtaMinutes');
  if (maxEtaMinutes) filters.maxEtaMinutes = Number(maxEtaMinutes);
  const maxDeliveryFee = url.searchParams.get('maxDeliveryFee');
  if (maxDeliveryFee) filters.maxDeliveryFee = Number(maxDeliveryFee);
  const priceRange = url.searchParams.get('priceRange');
  if (priceRange === 'budget' || priceRange === 'mid' || priceRange === 'premium') {
    filters.priceRange = priceRange;
  }
  const sort = url.searchParams.get('sort');
  if (sort) filters.sort = sort as SearchFilters['sort'];

  return {
    q: url.searchParams.get('q') ?? '',
    lat: Number(url.searchParams.get('lat') ?? '17.4401'),
    lng: Number(url.searchParams.get('lng') ?? '78.3489'),
    limit: Number(url.searchParams.get('limit') ?? '8'),
    filters,
  };
}

export function buildSearchPlatformResponse(
  params: SearchQueryParams,
  context: SearchContext,
): SearchPlatformResponse {
  const started = Date.now();
  const query = params.q.trim();
  const pool = sortRestaurants(
    applySearchFilters(context.restaurants, params.filters),
    params.filters?.sort,
  );

  const restaurants = pool
    .filter(
      (restaurant) =>
        matchesQuery(restaurant.displayName, query) ||
        restaurant.cuisines.some((cuisine) => matchesQuery(cuisine, query)),
    )
    .slice(0, params.limit ?? 8);

  const foods = context.menuItems
    .filter(
      (item) =>
        matchesQuery(item.name, query) ||
        matchesQuery(item.category, query) ||
        matchesQuery(item.description ?? '', query),
    )
    .slice(0, params.limit ?? 8)
    .map((item) => ({
      id: item.id,
      type: 'food' as const,
      label: item.name,
      subtitle: item.category,
      imageUrl: item.image,
      slug: item.restaurantSlug,
      meta: { price: item.price, isVeg: item.isVeg, tenantId: item.tenantId },
    }));

  const categories = [...new Set(context.menuItems.map((item) => item.category))]
    .filter((category) => matchesQuery(category, query))
    .slice(0, 8)
    .map((category) => ({
      id: `cat_${normalizeForMatch(category).replace(/\s+/g, '_')}`,
      type: 'category' as const,
      label: category,
      meta: { category },
    }));

  const cuisines = [...new Set(pool.flatMap((restaurant) => restaurant.cuisines))]
    .filter((cuisine) => matchesQuery(cuisine, query))
    .slice(0, 8)
    .map((cuisine) => ({
      id: `cuisine_${normalizeForMatch(cuisine).replace(/\s+/g, '_')}`,
      type: 'collection' as const,
      label: cuisine,
      meta: { query: cuisine },
    }));

  const offers = pool
    .filter((restaurant) => restaurant.badges.includes('offer'))
    .filter(
      (restaurant) =>
        !normalizeForMatch(query) ||
        matchesQuery(restaurant.displayName, query) ||
        matchesQuery('offer', query),
    )
    .slice(0, 4)
    .map((restaurant) => ({
      id: `offer_${restaurant.restaurantId}`,
      type: 'offer' as const,
      label: restaurant.displayName,
      subtitle: 'Special offer available',
      imageUrl: restaurant.logoUrl,
      restaurant,
    }));

  const cloudKitchens = pool
    .filter((restaurant) => restaurant.badges.includes('cloud_kitchen'))
    .filter(
      (restaurant) =>
        !normalizeForMatch(query) ||
        matchesQuery(restaurant.displayName, query) ||
        normalizeForMatch(query).includes('cloud'),
    )
    .slice(0, 4)
    .map(restaurantToItem)
    .map((item) => ({ ...item, type: 'cloud_kitchen' as const }));

  const brands = restaurants.slice(0, 4).map((restaurant) => ({
    id: `brand_${restaurant.restaurantId}`,
    type: 'brand' as const,
    label: restaurant.displayName,
    subtitle: restaurant.cuisines.join(' · '),
    imageUrl: restaurant.logoUrl,
    slug: restaurant.restaurantSlug,
    restaurant,
  }));

  const sections: SearchResultSection[] = [];
  const push = (section: SearchResultSection) => {
    if (section.items.length > 0) sections.push(section);
  };

  push({
    id: 'restaurants',
    title: 'Restaurants',
    type: 'restaurant',
    items: restaurants.map(restaurantToItem),
    total: restaurants.length,
  });
  push({ id: 'foods', title: 'Foods', type: 'food', items: foods, total: foods.length });
  push({ id: 'categories', title: 'Categories', type: 'category', items: categories });
  push({ id: 'collections', title: 'Cuisines', type: 'collection', items: cuisines });
  push({ id: 'offers', title: 'Offers', type: 'offer', items: offers });
  push({ id: 'cloud_kitchens', title: 'Cloud Kitchens', type: 'cloud_kitchen', items: cloudKitchens });
  push({ id: 'brands', title: 'Brands', type: 'brand', items: brands });

  const totalResults = sections.reduce((sum, section) => sum + section.items.length, 0);

  return {
    query,
    sections,
    meta: {
      provider: 'firestore-search-platform',
      totalResults,
      tookMs: Date.now() - started,
    },
  };
}

export function buildSearchSuggestions(
  query: string,
  context: SearchContext,
): SearchSuggestionsResponse {
  const suggestions: SearchSuggestion[] = [];
  const normalized = normalizeForMatch(query);

  if (normalized) {
    for (const restaurant of context.restaurants) {
      if (matchesQuery(restaurant.displayName, query)) {
        suggestions.push({
          id: `sug_r_${restaurant.restaurantId}`,
          label: restaurant.displayName,
          type: 'restaurant',
        });
      }
    }
    for (const item of context.menuItems) {
      if (matchesQuery(item.name, query)) {
        suggestions.push({ id: `sug_f_${item.id}`, label: item.name, type: 'food' });
      }
    }
    for (const cuisine of new Set(context.restaurants.flatMap((r) => r.cuisines))) {
      if (matchesQuery(cuisine, query)) {
        suggestions.push({ id: `sug_c_${cuisine}`, label: cuisine, type: 'cuisine' });
      }
    }
  }

  for (const label of buildPopularTerms(context).slice(0, 6)) {
    if (!normalized || normalizeForMatch(label).includes(normalized)) {
      suggestions.push({ id: `sug_q_${label}`, label, type: 'query' });
    }
  }

  return { query, suggestions: suggestions.slice(0, 8) };
}

function buildPopularTerms(context: SearchContext): string[] {
  const cuisineCounts = new Map<string, number>();
  for (const restaurant of context.restaurants) {
    for (const cuisine of restaurant.cuisines) {
      cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) ?? 0) + 1);
    }
  }
  const cuisines = [...cuisineCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => label);

  const foodCounts = new Map<string, number>();
  for (const item of context.menuItems) {
    foodCounts.set(item.name, (foodCounts.get(item.name) ?? 0) + 1);
  }
  const foods = [...foodCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => label);

  return [...new Set([...foods, ...cuisines])];
}

export function buildSearchTrending(context: SearchContext): SearchTrendingResponse {
  const popular = buildPopularTerms(context).slice(0, 8).map((label, index) => ({
    id: `p${index + 1}`,
    label,
  }));

  const trending = context.menuItems
    .slice(0, 8)
    .map((item, index) => ({
      id: `t${index + 1}`,
      label: item.name,
      count: item.price,
    }));

  return { trending, popular };
}

export function buildSearchRecent(): SearchRecentResponse {
  return { recent: [] };
}

export function buildSearchCollections(context: SearchContext): SearchCollectionsResponse {
  const cuisines = [...new Set(context.restaurants.flatMap((restaurant) => restaurant.cuisines))]
    .slice(0, 8)
    .map((label) => ({ id: `cuisine_${label}`, label, query: label }));

  const categories = [...new Set(context.menuItems.map((item) => item.category))]
    .slice(0, 8)
    .map((label) => ({ id: `cat_${label}`, label, query: label }));

  const sections: SearchBrowseSection[] = [
    {
      id: 'nearby',
      title: 'Nearby',
      kind: 'chips',
      items: [{ id: 'nearby', label: 'Restaurants near you', query: 'nearby restaurants' }],
    },
    {
      id: 'recommended',
      title: 'Recommended',
      kind: 'chips',
      items: [{ id: 'recommended', label: 'Recommended for you', query: 'recommended' }],
    },
  ];

  if (categories.length > 0) {
    sections.push({
      id: 'popular-categories',
      title: 'Popular Categories',
      kind: 'chips',
      items: categories,
    });
  }

  if (cuisines.length > 0) {
    sections.push({
      id: 'popular-cuisines',
      title: 'Popular Cuisines',
      kind: 'chips',
      items: cuisines,
    });
  }

  if (context.restaurants.some((restaurant) => restaurant.badges.includes('offer'))) {
    sections.push({
      id: 'offers',
      title: 'Offers',
      kind: 'chips',
      items: [{ id: 'offer_live', label: 'Live Offers', query: 'offer' }],
    });
  }

  return { sections };
}

export function buildLegacySearchResponse(query: string, context: SearchContext) {
  const response = buildSearchPlatformResponse({ q: query, lat: 17.44, lng: 78.35 }, context);
  const hits = response.sections
    .flatMap((section) => section.items)
    .filter((item) => item.type === 'restaurant' && item.restaurant)
    .map((item) => ({
      type: 'restaurant' as const,
      restaurant: item.restaurant!,
      label: item.label,
      subtitle: item.subtitle,
    }));
  return { hits, meta: { provider: 'firestore-search-legacy' } };
}

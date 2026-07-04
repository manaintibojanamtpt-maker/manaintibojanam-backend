import type { RestaurantPublic } from '@/types/marketplace';
import { DISCOVERY_MOCK_POOL } from '@/marketplace-api/mocks/discoveryFixtures';
import { FOOD_CATEGORIES } from '@/features/experience/data/mockCatalog';
import type {
  SearchBrowseSection,
  SearchCollectionsResponse,
  SearchFilters,
  SearchPlatformResponse,
  SearchQueryParams,
  SearchRecentResponse,
  SearchResultItem,
  SearchResultSection,
  SearchSuggestion,
  SearchSuggestionsResponse,
  SearchTrendingResponse,
} from '@/types/marketplace-search';

const MOCK_FOODS: SearchResultItem[] = [
  {
    id: 'food_biryani',
    type: 'food',
    label: 'Hyderabadi Chicken Biryani',
    subtitle: 'Served with raita and salan',
    imageUrl: 'https://placehold.co/120x120/orange/white?text=Biryani',
    meta: { price: 249, isVeg: false },
  },
  {
    id: 'food_paneer',
    type: 'food',
    label: 'Paneer Butter Masala',
    subtitle: 'Rich creamy gravy',
    imageUrl: 'https://placehold.co/120x120/green/white?text=Paneer',
    meta: { price: 199, isVeg: true },
  },
  {
    id: 'food_dosa',
    type: 'food',
    label: 'Masala Dosa',
    subtitle: 'Crisp dosa with potato masala',
    imageUrl: 'https://placehold.co/120x120/green/white?text=Dosa',
    meta: { price: 89, isVeg: true },
  },
  {
    id: 'food_thali',
    type: 'food',
    label: 'Festival Special Thali',
    subtitle: 'Limited time festive platter',
    imageUrl: 'https://placehold.co/120x120/gold/white?text=Thali',
    meta: { price: 399, isVeg: true },
  },
];

const MOCK_BRANDS: SearchResultItem[] = [
  {
    id: 'brand_mana_inti',
    type: 'brand',
    label: 'Mana Inti Kitchen',
    subtitle: 'Andhra · Biryani · Meals',
    imageUrl: 'https://placehold.co/64x64/orange/white?text=MI',
  },
  {
    id: 'brand_chai_point',
    type: 'brand',
    label: 'Chai & Snacks Point',
    subtitle: 'Beverages · Snacks',
    imageUrl: 'https://placehold.co/64x64/brown/white?text=CP',
  },
];

const BROWSE_COLLECTIONS: SearchBrowseSection[] = [
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
  {
    id: 'popular-categories',
    title: 'Popular Categories',
    kind: 'chips',
    items: FOOD_CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      emoji: c.emoji,
      query: c.label,
    })),
  },
  {
    id: 'popular-cuisines',
    title: 'Popular Cuisines',
    kind: 'chips',
    items: [
      { id: 'cuisine_biryani', label: 'Biryani', query: 'biryani' },
      { id: 'cuisine_south', label: 'South Indian', query: 'south indian' },
      { id: 'cuisine_chinese', label: 'Chinese', query: 'chinese' },
      { id: 'cuisine_healthy', label: 'Healthy', query: 'healthy' },
      { id: 'cuisine_desserts', label: 'Desserts', query: 'desserts' },
    ],
  },
  {
    id: 'popular-collections',
    title: 'Popular Collections',
    kind: 'chips',
    items: [
      { id: 'col_top_rated', label: 'Top Rated', query: 'top rated' },
      { id: 'col_fast', label: 'Fast Delivery', query: 'fast delivery' },
      { id: 'col_new', label: 'New on OrderBhojan', query: 'new restaurants' },
    ],
  },
  {
    id: 'offers',
    title: 'Offers',
    kind: 'chips',
    items: [
      { id: 'offer_50', label: '50% OFF', query: '50 off' },
      { id: 'offer_free', label: 'Free Delivery', query: 'free delivery' },
    ],
  },
  {
    id: 'festival',
    title: 'Festival Collections',
    kind: 'chips',
    items: [{ id: 'fest_thali', label: 'Festival Thali', query: 'festival thali' }],
  },
  {
    id: 'cloud-kitchens',
    title: 'Cloud Kitchens',
    kind: 'chips',
    items: [{ id: 'cloud', label: 'Cloud Kitchens', query: 'cloud kitchen' }],
  },
  {
    id: 'fast-delivery',
    title: 'Fast Delivery',
    kind: 'chips',
    items: [{ id: 'fast', label: 'Under 30 min', query: 'fast delivery' }],
  },
  {
    id: 'healthy',
    title: 'Healthy Choices',
    kind: 'chips',
    items: [{ id: 'healthy', label: 'Healthy Choices', query: 'healthy' }],
  },
  {
    id: 'family',
    title: 'Family Meals',
    kind: 'chips',
    items: [{ id: 'family', label: 'Family Meals', query: 'family meals' }],
  },
  {
    id: 'breakfast',
    title: 'Breakfast',
    kind: 'chips',
    items: [{ id: 'breakfast', label: 'Breakfast', query: 'breakfast' }],
  },
  {
    id: 'lunch',
    title: 'Lunch',
    kind: 'chips',
    items: [{ id: 'lunch', label: 'Lunch Picks', query: 'lunch' }],
  },
  {
    id: 'dinner',
    title: 'Dinner',
    kind: 'chips',
    items: [{ id: 'dinner', label: 'Dinner Favourites', query: 'dinner' }],
  },
  {
    id: 'late-night',
    title: 'Late Night',
    kind: 'chips',
    items: [{ id: 'late', label: 'Late Night', query: 'late night' }],
  },
];

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function matchesQuery(text: string, query: string): boolean {
  const nq = normalizeQuery(query);
  if (!nq) return true;
  return text.toLowerCase().includes(nq);
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
    result = result.filter(
      (r) => r.badges.includes('veg') || r.badges.includes('pure_veg'),
    );
  }
  if (filters.nonVegOnly) {
    result = result.filter(
      (r) => !r.badges.includes('pure_veg'),
    );
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
    const wanted = new Set(filters.cuisines.map((c) => c.toLowerCase()));
    result = result.filter((r) =>
      r.cuisines.some((c) => wanted.has(c.toLowerCase())),
    );
  }
  if (filters.priceRange === 'budget') {
    result = result.filter((r) => (r.priceForTwo ?? 999) <= 350);
  }
  if (filters.priceRange === 'mid') {
    result = result.filter((r) => {
      const p = r.priceForTwo ?? 0;
      return p > 350 && p <= 600;
    });
  }
  if (filters.priceRange === 'premium') {
    result = result.filter((r) => (r.priceForTwo ?? 0) > 600);
  }

  return result;
}

function sortRestaurants(
  restaurants: readonly RestaurantPublic[],
  sort?: SearchFilters['sort'],
): RestaurantPublic[] {
  const copy = [...restaurants];
  switch (sort) {
    case 'distance':
      return copy.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    case 'rating':
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'newest':
      return copy.sort((a, b) => {
        const aNew = a.badges.includes('new') ? 1 : 0;
        const bNew = b.badges.includes('new') ? 1 : 0;
        return bNew - aNew;
      });
    case 'alphabetical':
      return copy.sort((a, b) => a.displayName.localeCompare(b.displayName));
    case 'popularity':
    default:
      return copy.sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
  }
}

export function buildSearchPlatformResponse(
  params: SearchQueryParams,
): SearchPlatformResponse {
  const query = params.q.trim();
  const nq = normalizeQuery(query);
  const pool = sortRestaurants(
    applySearchFilters(DISCOVERY_MOCK_POOL, params.filters),
    params.filters?.sort,
  );

  const restaurants = pool
    .filter(
      (r) =>
        matchesQuery(r.displayName, query) ||
        r.cuisines.some((c) => matchesQuery(c, query)),
    )
    .slice(0, params.limit ?? 8);

  const foods = MOCK_FOODS.filter(
    (f) => matchesQuery(f.label, query) || matchesQuery(f.subtitle ?? '', query),
  );

  const categories: SearchResultItem[] = FOOD_CATEGORIES.filter((c) =>
    matchesQuery(c.label, query),
  ).map((c) => ({
    id: `cat_${c.id}`,
    type: 'category' as const,
    label: c.label,
    subtitle: c.emoji,
    meta: { categoryId: c.id },
  }));

  const collections: SearchResultItem[] = BROWSE_COLLECTIONS.flatMap((section) =>
    section.items.filter((item) => matchesQuery(item.label, query)),
  ).map((item) => ({
    id: item.id,
    type: 'collection',
    label: item.label,
    subtitle: item.subtitle,
    meta: { query: item.query ?? item.label },
  }));

  const offers = pool
    .filter((r) => r.badges.includes('offer'))
    .filter((r) => !nq || matchesQuery(r.displayName, query) || matchesQuery('offer', query))
    .slice(0, 4)
    .map((r) => ({
      id: `offer_${r.restaurantId}`,
      type: 'offer' as const,
      label: r.displayName,
      subtitle: 'Special offer available',
      imageUrl: r.logoUrl,
      restaurant: r,
    }));

  const cloudKitchens = pool
    .filter((r) => r.badges.includes('cloud_kitchen'))
    .filter((r) => !nq || matchesQuery(r.displayName, query) || nq.includes('cloud'))
    .slice(0, 4)
    .map(restaurantToItem)
    .map((item) => ({ ...item, type: 'cloud_kitchen' as const }));

  const brands = MOCK_BRANDS.filter(
    (b) => matchesQuery(b.label, query) || matchesQuery(b.subtitle ?? '', query),
  );

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
  push({
    id: 'foods',
    title: 'Foods',
    type: 'food',
    items: foods,
    total: foods.length,
  });
  push({
    id: 'categories',
    title: 'Categories',
    type: 'category',
    items: categories,
  });
  push({
    id: 'collections',
    title: 'Collections',
    type: 'collection',
    items: collections,
  });
  push({
    id: 'offers',
    title: 'Offers',
    type: 'offer',
    items: offers,
  });
  push({
    id: 'cloud_kitchens',
    title: 'Cloud Kitchens',
    type: 'cloud_kitchen',
    items: cloudKitchens,
  });
  push({
    id: 'brands',
    title: 'Brands',
    type: 'brand',
    items: brands,
  });

  const totalResults = sections.reduce((sum, s) => sum + s.items.length, 0);

  return {
    query,
    sections,
    meta: {
      provider: 'mock-search-platform',
      totalResults,
      tookMs: 12,
    },
  };
}

export function buildSearchSuggestions(query: string): SearchSuggestionsResponse {
  const nq = normalizeQuery(query);
  const suggestions: SearchSuggestion[] = [];

  if (nq) {
    for (const r of DISCOVERY_MOCK_POOL) {
      if (matchesQuery(r.displayName, query)) {
        suggestions.push({
          id: `sug_r_${r.restaurantId}`,
          label: r.displayName,
          type: 'restaurant',
        });
      }
    }
    for (const f of MOCK_FOODS) {
      if (matchesQuery(f.label, query)) {
        suggestions.push({ id: `sug_f_${f.id}`, label: f.label, type: 'food' });
      }
    }
    for (const c of FOOD_CATEGORIES) {
      if (matchesQuery(c.label, query)) {
        suggestions.push({ id: `sug_c_${c.id}`, label: c.label, type: 'cuisine' });
      }
    }
  }

  const popular = ['Biryani', 'Dosa', 'Pizza', 'Healthy', 'Cloud Kitchen'];
  for (const label of popular) {
    if (!nq || label.toLowerCase().includes(nq)) {
      suggestions.push({ id: `sug_q_${label}`, label, type: 'query' });
    }
  }

  return {
    query,
    suggestions: suggestions.slice(0, 8),
  };
}

export function buildSearchTrending(): SearchTrendingResponse {
  return {
    trending: [
      { id: 't1', label: 'Chicken Biryani', count: 1240 },
      { id: 't2', label: 'Masala Dosa', count: 980 },
      { id: 't3', label: 'Paneer Butter Masala', count: 860 },
      { id: 't4', label: 'Cloud Kitchen', count: 720 },
    ],
    popular: [
      { id: 'p1', label: 'Biryani' },
      { id: 'p2', label: 'Veg Meals' },
      { id: 'p3', label: 'Ice Cream' },
      { id: 'p4', label: 'Chinese' },
      { id: 'p5', label: 'Healthy' },
      { id: 'p6', label: 'Late Night' },
    ],
  };
}

export function buildSearchRecent(): SearchRecentResponse {
  return {
    recent: [
      { id: 'r1', label: 'Biryani' },
      { id: 'r2', label: 'Dosa' },
      { id: 'r3', label: 'Pizza' },
    ],
  };
}

export function buildSearchCollections(): SearchCollectionsResponse {
  return { sections: BROWSE_COLLECTIONS };
}

export function parseSearchQueryParams(url: URL): SearchQueryParams {
  const filters: {
    cuisines?: string[];
    vegOnly?: boolean;
    nonVegOnly?: boolean;
    cloudKitchenOnly?: boolean;
    openNowOnly?: boolean;
    offersOnly?: boolean;
    minRating?: number;
    maxDistanceKm?: number;
    maxEtaMinutes?: number;
    maxDeliveryFee?: number;
    priceRange?: 'budget' | 'mid' | 'premium';
    sort?: SearchFilters['sort'];
  } = {};

  const cuisines = url.searchParams.get('cuisines');
  if (cuisines) filters.cuisines = cuisines.split(',').map((c) => c.trim());
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

export function buildLegacySearchResponse(query: string) {
  const response = buildSearchPlatformResponse({ q: query, lat: 17.44, lng: 78.35 });
  const hits = response.sections
    .flatMap((s) => s.items)
    .filter((i) => i.type === 'restaurant' && i.restaurant)
    .map((item) => ({
      type: 'restaurant' as const,
      restaurant: item.restaurant!,
      label: item.label,
      subtitle: item.subtitle,
    }));
  return { hits, meta: { provider: 'mock-firestore-search' } };
}

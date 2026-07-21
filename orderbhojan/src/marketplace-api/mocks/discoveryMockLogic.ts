import type { RestaurantPublic } from '@/types/marketplace';
import type {
  DiscoveryCollection,
  DiscoveryCollectionId,
  DiscoveryFilters,
  DiscoveryHomeResponse,
  DiscoveryPagination,
} from '@/types/marketplace-discovery';
import { DISCOVERY_COLLECTION_META, DISCOVERY_MOCK_POOL } from './discoveryFixtures';
import { applyDiscoveryFilters, sortRestaurants } from '@/features/discovery/domain/filters';
import { getCollectionDefinition, HOME_COLLECTION_IDS } from '@/features/discovery/domain/collections';

export interface DiscoveryRequestParams {
  lat: number;
  lng: number;
  page?: number;
  limit?: number;
  filters?: DiscoveryFilters;
}

function parseFiltersFromUrl(url: URL): DiscoveryFilters {
  const filters: {
    maxDistanceKm?: number;
    minRating?: number;
    maxDeliveryFee?: number;
    vegOnly?: boolean;
    cloudKitchenOnly?: boolean;
    offersOnly?: boolean;
    openNowOnly?: boolean;
    cuisines?: string[];
    sort?: DiscoveryFilters['sort'];
  } = {};
  const maxDistanceKm = url.searchParams.get('maxDistanceKm');
  const minRating = url.searchParams.get('minRating');
  const maxDeliveryFee = url.searchParams.get('maxDeliveryFee');
  const sort = url.searchParams.get('sort');

  if (maxDistanceKm) filters.maxDistanceKm = Number(maxDistanceKm);
  if (minRating) filters.minRating = Number(minRating);
  if (maxDeliveryFee) filters.maxDeliveryFee = Number(maxDeliveryFee);
  if (url.searchParams.get('vegOnly') === 'true') filters.vegOnly = true;
  if (url.searchParams.get('cloudKitchenOnly') === 'true') filters.cloudKitchenOnly = true;
  if (url.searchParams.get('offersOnly') === 'true') filters.offersOnly = true;
  if (url.searchParams.get('openNowOnly') === 'true') filters.openNowOnly = true;
  const cuisines = url.searchParams.get('cuisines');
  if (cuisines) filters.cuisines = cuisines.split(',').map((c) => c.trim()).filter(Boolean);
  if (sort) filters.sort = sort as DiscoveryFilters['sort'];

  return filters;
}

function selectForCollection(
  id: DiscoveryCollectionId,
  pool: readonly RestaurantPublic[],
): RestaurantPublic[] {
  switch (id) {
    case 'nearby':
      return sortRestaurants(pool, 'distance');
    case 'top-rated':
      return sortRestaurants(pool, 'rating');
    case 'fast-delivery':
      return pool.filter((r) => (r.etaMinutes?.max ?? 99) <= 30);
    case 'cloud-kitchens':
      return pool.filter((r) => r.badges.includes('cloud_kitchen'));
    case 'offers':
      return pool.filter((r) => r.badges.includes('offer'));
    case 'trending':
      return sortRestaurants(pool, 'popularity').slice(0, 8);
    case 'recommended':
      return sortRestaurants(pool, 'rating').filter((r) => r.isOpen);
    case 'popular-near-you':
      return sortRestaurants(pool, 'popularity').filter((r) => (r.distanceKm ?? 99) <= 4);
    case 'new-on-orderbhojan':
    case 'recently-added':
      return pool.filter((r) => r.badges.includes('new'));
    case 'breakfast':
      return pool.filter((r) =>
        r.cuisines.some((c) => /breakfast|beverage|snack|chai/i.test(c)),
      );
    case 'lunch':
      return pool.filter((r) =>
        r.cuisines.some((c) => /meals|thali|biryani|indian/i.test(c)),
      );
    case 'dinner':
      return sortRestaurants(pool, 'rating');
    case 'late-night':
      return pool.filter((r) =>
        r.cuisines.some((c) => /late night|biryani/i.test(c)) || r.badges.includes('cloud_kitchen'),
      );
    case 'festival-specials':
      return pool.filter((r) => r.cuisines.some((c) => /festive|thali/i.test(c)));
    case 'healthy-choices':
      return pool.filter(
        (r) =>
          r.badges.includes('pure_veg') ||
          r.cuisines.some((c) => /healthy|salad/i.test(c)),
      );
    case 'family-meals':
      return pool.filter((r) => r.cuisines.some((c) => /family|meals/i.test(c)));
    case 'beverages':
      return pool.filter((r) => r.cuisines.some((c) => /beverage|snack|chai/i.test(c)));
    case 'desserts':
      return pool.filter((r) => r.cuisines.some((c) => /dessert|bakery/i.test(c)));
    case 'featured':
    default:
      return sortRestaurants(pool, 'rating').slice(0, 6);
  }
}

function paginate(
  items: readonly RestaurantPublic[],
  page: number,
  limit: number,
): { items: RestaurantPublic[]; pagination: DiscoveryPagination } {
  const start = (page - 1) * limit;
  const slice = items.slice(start, start + limit);
  return {
    items: slice,
    pagination: {
      page,
      limit,
      hasMore: start + limit < items.length,
      total: items.length,
    },
  };
}

function locationLabel(lat: number, lng: number): string {
  if (lat > 17 && lat < 18 && lng > 78 && lng < 79) return 'Gachibowli, Hyderabad';
  if (lat > 18 && lat < 19 && lng > 72 && lng < 74) return 'Koregaon Park, Pune';
  return 'Demo Locality, India';
}

export function buildDiscoveryCollection(
  id: DiscoveryCollectionId,
  params: DiscoveryRequestParams,
): DiscoveryCollection {
  const page = params.page ?? 1;
  const limit = params.limit ?? 6;
  const meta = DISCOVERY_COLLECTION_META[id] ?? DISCOVERY_COLLECTION_META.featured;
  const def = getCollectionDefinition(id);

  let pool = applyDiscoveryFilters([...DISCOVERY_MOCK_POOL], params.filters);
  pool = selectForCollection(id, pool);
  const { items, pagination } = paginate(pool, page, limit);

  return {
    id,
    title: def.title,
    subtitle: def.subtitle ?? meta.subtitle,
    restaurants: items,
    pagination,
    backedByApi: def.backedByApi,
  };
}

export function buildDiscoveryHome(params: DiscoveryRequestParams): DiscoveryHomeResponse {
  const collections = HOME_COLLECTION_IDS.map((id) =>
    buildDiscoveryCollection(id, { ...params, page: 1, limit: 6 }),
  ).filter((c) => c.restaurants.length > 0);

  return {
    locationLabel: locationLabel(params.lat, params.lng),
    collections,
  };
}

export function parseDiscoveryRequest(url: URL): DiscoveryRequestParams {
  const latParam = url.searchParams.get('lat');
  const lngParam = url.searchParams.get('lng');
  if (latParam == null || lngParam == null || latParam === '' || lngParam === '') {
    throw Object.assign(new Error('lat and lng are required'), {
      statusCode: 400,
      code: 'LOCATION_REQUIRED',
    });
  }
  const lat = Number(latParam);
  const lng = Number(lngParam);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    throw Object.assign(new Error('lat and lng are required'), {
      statusCode: 400,
      code: 'LOCATION_REQUIRED',
    });
  }
  const page = Number(url.searchParams.get('page') ?? '1');
  const limit = Number(url.searchParams.get('limit') ?? '6');
  return {
    lat,
    lng,
    page,
    limit,
    filters: parseFiltersFromUrl(url),
  };
}

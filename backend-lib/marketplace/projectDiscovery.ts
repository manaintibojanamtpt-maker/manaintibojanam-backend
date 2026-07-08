import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { parseFirestoreTenant, type FirestoreTenantRecord } from './projectFoodMenuV1.js';
import {
  isStoreOpenNow,
  kitchenDietaryToBadges,
  resolveDeliveryFeeForDisplay,
  resolveKitchenDietaryFromMenuTypes,
  resolveStoreTiming,
  roadDistanceKm,
  isImplausibleCustomerDistance,
  extractTenantSyncRevision,
  mergeSyncRevisions,
} from './tenantProjectionHelpers.js';
import { isConsumerListedTenant, isMarketplaceVisibleTenant } from './marketplaceVisibility.js';
import {
  isWithinConsumerDiscoveryRadius,
  kitchenFormatLabel,
  resolveKitchenFormat,
  type KitchenFormat,
} from './kitchenFormat.js';
import {
  loadVisibleDiscoveryProfiles,
} from './discoveryProfileWriter.js';
import { isMarketplaceGeoIndexEnabled } from './marketplaceGeoIndexPolicy.js';
import { resolveNearbyTenantIds } from './geoIndexFirestore.js';

export type RestaurantBadge = 'veg' | 'pure_veg' | 'cloud_kitchen' | 'new' | 'offer';

export type { KitchenFormat } from './kitchenFormat.js';
export { MARKETPLACE_CONSUMER_MAX_DISTANCE_KM, resolveKitchenFormat, kitchenFormatLabel } from './kitchenFormat.js';

export interface RestaurantPublic {
  readonly restaurantId: string;
  readonly restaurantSlug: string;
  readonly displayName: string;
  readonly logoUrl?: string;
  readonly coverUrl?: string;
  readonly rating?: number;
  readonly ratingCount?: number;
  readonly cuisines: readonly string[];
  readonly priceForTwo?: number;
  readonly distanceKm?: number;
  readonly etaMinutes?: { readonly min: number; readonly max: number };
  readonly deliveryFee?: number | null;
  readonly isOpen: boolean;
  readonly badges: readonly RestaurantBadge[];
  readonly kitchenFormat: KitchenFormat;
}

export type DiscoveryCollectionId =
  | 'nearby'
  | 'top-rated'
  | 'fast-delivery'
  | 'cloud-kitchens'
  | 'recently-added'
  | 'trending'
  | 'recommended'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'late-night'
  | 'offers'
  | 'festival-specials'
  | 'popular-near-you'
  | 'new-on-orderbhojan'
  | 'healthy-choices'
  | 'family-meals'
  | 'beverages'
  | 'desserts'
  | 'featured';

export interface DiscoveryFilters {
  readonly maxDistanceKm?: number;
  readonly minRating?: number;
  readonly maxDeliveryFee?: number;
  readonly vegOnly?: boolean;
  readonly cloudKitchenOnly?: boolean;
  readonly kitchenFormat?: KitchenFormat;
  readonly offersOnly?: boolean;
  readonly openNowOnly?: boolean;
  readonly cuisines?: readonly string[];
  readonly sort?: 'popularity' | 'eta' | 'distance' | 'rating' | 'newest' | 'alphabetical';
}

export interface DiscoveryPagination {
  readonly page: number;
  readonly limit: number;
  readonly hasMore: boolean;
  readonly total?: number;
}

export interface DiscoveryCollection {
  readonly id: DiscoveryCollectionId;
  readonly title: string;
  readonly subtitle?: string;
  readonly restaurants: readonly RestaurantPublic[];
  readonly pagination?: DiscoveryPagination;
  readonly backedByApi: boolean;
}

export interface DiscoveryHomeResponse {
  readonly locationLabel?: string;
  readonly collections: readonly DiscoveryCollection[];
}

export interface DiscoveryRequestParams {
  readonly lat: number;
  readonly lng: number;
  readonly page?: number;
  readonly limit?: number;
  readonly filters?: DiscoveryFilters;
}

const COLLECTION_META: Record<
  DiscoveryCollectionId,
  { title: string; subtitle?: string; backedByApi: boolean; homeOrder: number }
> = {
  nearby: { title: 'Nearby Restaurants', subtitle: 'Closest to you', backedByApi: true, homeOrder: 1 },
  featured: { title: 'Featured', subtitle: 'Curated for you', backedByApi: true, homeOrder: 2 },
  'top-rated': { title: 'Top Rated', subtitle: 'Loved by foodies', backedByApi: true, homeOrder: 3 },
  trending: { title: 'Trending Now', backedByApi: true, homeOrder: 4 },
  'fast-delivery': { title: 'Fast Delivery', subtitle: 'Under 30 minutes', backedByApi: false, homeOrder: 5 },
  'cloud-kitchens': { title: 'Cloud Kitchens', subtitle: 'Delivery-only gems', backedByApi: false, homeOrder: 6 },
  offers: { title: 'Offers & Deals', backedByApi: true, homeOrder: 7 },
  recommended: { title: 'Recommended for You', backedByApi: false, homeOrder: 8 },
  'popular-near-you': { title: 'Popular Near You', backedByApi: false, homeOrder: 9 },
  'new-on-orderbhojan': { title: 'New on OrderBhojan', backedByApi: false, homeOrder: 10 },
  breakfast: { title: 'Breakfast', backedByApi: false, homeOrder: 11 },
  lunch: { title: 'Lunch Picks', backedByApi: false, homeOrder: 12 },
  dinner: { title: 'Dinner Favourites', backedByApi: false, homeOrder: 13 },
  'late-night': { title: 'Late Night', backedByApi: false, homeOrder: 14 },
  'festival-specials': { title: 'Festival Specials', backedByApi: false, homeOrder: 15 },
  'healthy-choices': { title: 'Healthy Choices', backedByApi: false, homeOrder: 16 },
  'family-meals': { title: 'Family Meals', backedByApi: false, homeOrder: 17 },
  beverages: { title: 'Beverages & Snacks', backedByApi: false, homeOrder: 18 },
  desserts: { title: 'Desserts', backedByApi: false, homeOrder: 19 },
  'recently-added': { title: 'Recently Added', backedByApi: false, homeOrder: 20 },
};

const HOME_COLLECTION_IDS = Object.entries(COLLECTION_META)
  .sort(([, a], [, b]) => a.homeOrder - b.homeOrder)
  .map(([id]) => id as DiscoveryCollectionId);

export {
  isConsumerListedTenant,
  isMarketplaceVisibleTenant,
  isMarketplaceEligibleTenant,
} from './marketplaceVisibility.js';

export function projectRestaurantPublic(
  tenant: FirestoreTenantRecord,
  raw: Record<string, unknown>,
  coords: { lat: number; lng: number },
  menuTypes?: readonly ('veg' | 'non-veg')[],
): RestaurantPublic {
  const mp = tenant.marketplace;
  const timing = resolveStoreTiming(tenant, raw);
  const storeOpen = isStoreOpenNow(timing);
  const prepTime = tenant.deliveryConfig?.prepTime ?? 30;
  const cuisines = [...(mp?.cuisineTags ?? tenant.cuisineTags ?? [])];
  const kitchenDietary = menuTypes?.length
    ? resolveKitchenDietaryFromMenuTypes(menuTypes)
    : cuisines.some((c) => /pure veg|pure_veg/i.test(c))
      ? 'pure_veg'
      : 'unknown';
  const badges: RestaurantBadge[] = [...kitchenDietaryToBadges(kitchenDietary)];
  const kitchenFormat = resolveKitchenFormat(tenant.businessType);
  if (kitchenFormat === 'cloud_kitchen') badges.push('cloud_kitchen');
  if ((mp?.offers?.length ?? 0) > 0) badges.push('offer');

  let distanceKm: number | undefined;
  let deliveryFee: number | null | undefined;
  let etaMinutes: RestaurantPublic['etaMinutes'];

  if (tenant.location) {
    const computed = roadDistanceKm(
      coords.lat,
      coords.lng,
      tenant.location.lat,
      tenant.location.lng,
    );
    if (!isImplausibleCustomerDistance(computed)) {
      distanceKm = Math.round(computed * 10) / 10;
      etaMinutes = { min: prepTime, max: prepTime + 10 };
      const resolvedFee = resolveDeliveryFeeForDisplay(tenant.deliveryConfig, computed);
      if (resolvedFee !== undefined) deliveryFee = resolvedFee;
    }
  }

  return {
    restaurantId: mp?.publicRestaurantId ?? `obr_${tenant.slug}`,
    restaurantSlug: tenant.slug,
    displayName: tenant.name,
    logoUrl: mp?.theme?.logoUrl ?? tenant.branding?.logoUrl,
    coverUrl: mp?.theme?.coverUrl ?? tenant.branding?.coverUrl,
    rating: mp?.rating,
    ratingCount: mp?.ratingCount,
    cuisines,
    priceForTwo: mp?.priceForTwo,
    distanceKm,
    etaMinutes,
    deliveryFee: deliveryFee ?? undefined,
    isOpen: storeOpen,
    badges,
    kitchenFormat,
  };
}

function filterPoolByConsumerRadius(
  restaurants: readonly RestaurantPublic[],
): RestaurantPublic[] {
  return restaurants.filter((r) => isWithinConsumerDiscoveryRadius(r.distanceKm));
}

export async function loadMarketplaceRestaurants(
  db: Firestore,
  coords: { lat: number; lng: number },
): Promise<{ restaurants: RestaurantPublic[]; poolSyncRevision?: string }> {
  let loaded: { restaurants: RestaurantPublic[]; poolSyncRevision?: string };

  if (isMarketplaceGeoIndexEnabled()) {
    const geoIndexed = await loadMarketplaceRestaurantsFromGeoIndex(db, coords);
    if (geoIndexed.restaurants.length > 0) {
      loaded = geoIndexed;
    } else {
      const indexed = await loadMarketplaceRestaurantsFromProfiles(db, coords);
      loaded = indexed.restaurants.length > 0
        ? indexed
        : await loadMarketplaceRestaurantsFromTenantsScan(db, coords);
    }
  } else {
    const indexed = await loadMarketplaceRestaurantsFromProfiles(db, coords);
    loaded = indexed.restaurants.length > 0
      ? indexed
      : await loadMarketplaceRestaurantsFromTenantsScan(db, coords);
  }

  return {
    ...loaded,
    restaurants: filterPoolByConsumerRadius(loaded.restaurants),
  };
}

async function loadMarketplaceRestaurantsFromGeoIndex(
  db: Firestore,
  coords: { lat: number; lng: number },
): Promise<{ restaurants: RestaurantPublic[]; poolSyncRevision?: string }> {
  const { tenantIds } = await resolveNearbyTenantIds(db, coords);
  if (tenantIds.length === 0) {
    return { restaurants: [], poolSyncRevision: undefined };
  }

  const tenantRefs = tenantIds.map((tenantId) => db.collection('tenants').doc(tenantId));
  const tenantDocs = await db.getAll(...tenantRefs);
  const restaurants: RestaurantPublic[] = [];
  let poolSyncRevision: string | undefined;

  for (const tenantDoc of tenantDocs) {
    if (!tenantDoc.exists) continue;
    const raw = tenantDoc.data() as Record<string, unknown>;
    if (!isConsumerListedTenant(raw)) continue;
    poolSyncRevision = mergeSyncRevisions(poolSyncRevision, extractTenantSyncRevision(raw));
    const tenant = parseFirestoreTenant(tenantDoc.id, raw);
    restaurants.push(projectRestaurantPublic(tenant, raw, coords));
  }

  return {
    restaurants: sortRestaurants(restaurants, 'distance'),
    poolSyncRevision,
  };
}

async function loadMarketplaceRestaurantsFromProfiles(
  db: Firestore,
  coords: { lat: number; lng: number },
): Promise<{ restaurants: RestaurantPublic[]; poolSyncRevision?: string }> {
  const profiles = await loadVisibleDiscoveryProfiles(db);
  if (profiles.length === 0) {
    return { restaurants: [], poolSyncRevision: undefined };
  }

  const tenantRefs = profiles.map((entry) => db.collection('tenants').doc(entry.tenantId));
  const tenantDocs = await db.getAll(...tenantRefs);
  const restaurants: RestaurantPublic[] = [];
  let poolSyncRevision: string | undefined;

  for (const tenantDoc of tenantDocs) {
    if (!tenantDoc.exists) continue;
    const raw = tenantDoc.data() as Record<string, unknown>;
    if (!isConsumerListedTenant(raw)) continue;
    poolSyncRevision = mergeSyncRevisions(
      poolSyncRevision,
      extractTenantSyncRevision(raw),
      profiles.find((p) => p.tenantId === tenantDoc.id)?.profile.syncRevision,
    );
    const tenant = parseFirestoreTenant(tenantDoc.id, raw);
    restaurants.push(projectRestaurantPublic(tenant, raw, coords));
  }

  return { restaurants, poolSyncRevision };
}

async function loadMarketplaceRestaurantsFromTenantsScan(
  db: Firestore,
  coords: { lat: number; lng: number },
): Promise<{ restaurants: RestaurantPublic[]; poolSyncRevision?: string }> {
  const publishedSnap = await db.collection('tenants').where('storeStatus', '==', 'published').get();

  const seen = new Set<string>();
  const restaurants: RestaurantPublic[] = [];
  let poolSyncRevision: string | undefined;

  const ingest = (doc: QueryDocumentSnapshot) => {
    if (seen.has(doc.id)) return;
    seen.add(doc.id);
    const raw = doc.data() as Record<string, unknown>;
    if (!isConsumerListedTenant(raw)) return;
    poolSyncRevision = mergeSyncRevisions(poolSyncRevision, extractTenantSyncRevision(raw));
    const tenant = parseFirestoreTenant(doc.id, raw);
    restaurants.push(projectRestaurantPublic(tenant, raw, coords));
  };

  for (const doc of publishedSnap.docs) ingest(doc);

  return { restaurants, poolSyncRevision };
}

function applyDiscoveryFilters(
  restaurants: readonly RestaurantPublic[],
  filters: DiscoveryFilters = {},
): RestaurantPublic[] {
  let result = [...restaurants];

  if (filters.maxDistanceKm != null) {
    result = result.filter((r) => (r.distanceKm ?? Infinity) <= filters.maxDistanceKm!);
  }
  if (filters.minRating != null) {
    result = result.filter((r) => (r.rating ?? 0) >= filters.minRating!);
  }
  if (filters.maxDeliveryFee != null) {
    result = result.filter((r) => (r.deliveryFee ?? 0) <= filters.maxDeliveryFee!);
  }
  if (filters.vegOnly) {
    result = result.filter((r) => r.badges.includes('veg') || r.badges.includes('pure_veg'));
  }
  if (filters.cloudKitchenOnly) {
    result = result.filter((r) => r.badges.includes('cloud_kitchen') || r.kitchenFormat === 'cloud_kitchen');
  }
  if (filters.kitchenFormat) {
    result = result.filter((r) => r.kitchenFormat === filters.kitchenFormat);
  }
  if (filters.offersOnly) {
    result = result.filter((r) => r.badges.includes('offer'));
  }
  if (filters.openNowOnly) {
    result = result.filter((r) => r.isOpen);
  }
  if (filters.cuisines?.length) {
    const wanted = new Set(filters.cuisines.map((c) => c.toLowerCase()));
    result = result.filter((r) => r.cuisines.some((c) => wanted.has(c.toLowerCase())));
  }

  return sortRestaurants(result, filters.sort);
}

function sortRestaurants(
  restaurants: readonly RestaurantPublic[],
  sort: DiscoveryFilters['sort'] = 'popularity',
): RestaurantPublic[] {
  const copy = [...restaurants];
  switch (sort) {
    case 'distance':
      return copy.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    case 'rating':
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'eta':
      return copy.sort((a, b) => (a.etaMinutes?.min ?? 999) - (b.etaMinutes?.min ?? 999));
    case 'newest':
      return copy.sort((a, b) => Number(b.badges.includes('new')) - Number(a.badges.includes('new')));
    case 'alphabetical':
      return copy.sort((a, b) => a.displayName.localeCompare(b.displayName));
    case 'popularity':
    default:
      return copy.sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
  }
}

function selectForCollection(id: DiscoveryCollectionId, pool: readonly RestaurantPublic[]): RestaurantPublic[] {
  switch (id) {
    case 'nearby':
      return sortRestaurants(pool, 'distance');
    case 'top-rated':
      return sortRestaurants(pool, 'rating');
    case 'fast-delivery':
      return pool.filter((r) => (r.etaMinutes?.max ?? 99) <= 30);
    case 'cloud-kitchens':
      return pool.filter((r) => r.kitchenFormat === 'cloud_kitchen' || r.badges.includes('cloud_kitchen'));
    case 'offers':
      return pool.filter((r) => r.badges.includes('offer'));
    case 'trending':
      return sortRestaurants(pool, 'popularity').slice(0, 8);
    case 'recommended':
      return sortRestaurants(pool, 'rating').filter((r) => r.isOpen);
    case 'popular-near-you':
      return sortRestaurants(pool, 'popularity').filter((r) => (r.distanceKm ?? 99) <= 4);
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

function filtersForCollection(
  collectionId: DiscoveryCollectionId,
  filters: DiscoveryFilters = {},
): DiscoveryFilters {
  if (collectionId === 'cloud-kitchens') {
    const { cloudKitchenOnly: _c, kitchenFormat: _k, ...rest } = filters;
    return rest;
  }
  return filters;
}

function locationLabel(lat: number, lng: number): string {
  if (lat > 18.4 && lat < 18.7 && lng > 73.7 && lng < 74.05) return 'Pune';
  if (lat > 17 && lat < 18 && lng > 78 && lng < 79) return 'Hyderabad';
  if (lat > 12.8 && lat < 13.2 && lng > 77.4 && lng < 77.8) return 'Bengaluru';
  if (lat > 18.9 && lat < 19.3 && lng > 72.7 && lng < 73.1) return 'Mumbai';
  return 'Your area';
}

export function buildDiscoveryCollection(
  id: DiscoveryCollectionId,
  pool: readonly RestaurantPublic[],
  params: DiscoveryRequestParams,
): DiscoveryCollection {
  const page = params.page ?? 1;
  const limit = params.limit ?? 6;
  const meta = COLLECTION_META[id] ?? COLLECTION_META.featured;
  const scopedFilters = filtersForCollection(id, params.filters);
  let filtered = applyDiscoveryFilters([...pool], scopedFilters);
  filtered = selectForCollection(id, filtered);
  const { items, pagination } = paginate(filtered, page, limit);

  return {
    id,
    title: meta.title,
    subtitle: meta.subtitle,
    restaurants: items,
    pagination,
    backedByApi: meta.backedByApi,
  };
}

export function buildDiscoveryHome(
  pool: readonly RestaurantPublic[],
  params: DiscoveryRequestParams,
): DiscoveryHomeResponse {
  const collections = HOME_COLLECTION_IDS.map((id) =>
    buildDiscoveryCollection(id, pool, { ...params, page: 1, limit: 6 }),
  ).filter((c) => c.restaurants.length > 0);

  return {
    locationLabel: locationLabel(params.lat, params.lng),
    collections,
  };
}

export function parseDiscoveryRequest(url: URL): DiscoveryRequestParams {
  const lat = Number(url.searchParams.get('lat') ?? '17.4401');
  const lng = Number(url.searchParams.get('lng') ?? '78.3489');
  const page = Number(url.searchParams.get('page') ?? '1');
  const limit = Number(url.searchParams.get('limit') ?? '6');
  const filters: DiscoveryFilters = {};
  const maxDistanceKm = url.searchParams.get('maxDistanceKm');
  const minRating = url.searchParams.get('minRating');
  const maxDeliveryFee = url.searchParams.get('maxDeliveryFee');
  const sort = url.searchParams.get('sort');
  if (maxDistanceKm) filters.maxDistanceKm = Number(maxDistanceKm);
  if (minRating) filters.minRating = Number(minRating);
  if (maxDeliveryFee) filters.maxDeliveryFee = Number(maxDeliveryFee);
  if (url.searchParams.get('vegOnly') === 'true') filters.vegOnly = true;
  if (url.searchParams.get('cloudKitchenOnly') === 'true') filters.cloudKitchenOnly = true;
  const kitchenFormat = url.searchParams.get('kitchenFormat');
  if (kitchenFormat) filters.kitchenFormat = kitchenFormat as KitchenFormat;
  if (url.searchParams.get('offersOnly') === 'true') filters.offersOnly = true;
  if (url.searchParams.get('openNowOnly') === 'true') filters.openNowOnly = true;
  const cuisines = url.searchParams.get('cuisines');
  if (cuisines) filters.cuisines = cuisines.split(',').map((c) => c.trim()).filter(Boolean);
  if (sort) filters.sort = sort as DiscoveryFilters['sort'];

  return { lat, lng, page, limit, filters };
}

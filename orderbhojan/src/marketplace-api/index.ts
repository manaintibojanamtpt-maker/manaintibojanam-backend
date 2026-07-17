import { createMarketplaceHttpClient, type MarketplaceHttpClient } from './client';
import type {
  BillQuote,
  CustomerProfile,
  DiscoverResponse,
  MarketplaceHealth,
  MenuResponse,
  OrderSummary,
  OrderTrackingResponse,
  RestaurantDetailResponse,
  RestaurantPublic,
  SearchResponse,
} from '@/types/marketplace';
import type {
  DiscoveryCollectionId,
  DiscoveryCollectionResponse,
  DiscoveryHomeResponse,
} from '@/types/marketplace-discovery';
import type {
  DeliveryZoneResult,
  DistanceResult,
  PincodeValidationResult,
  ReverseGeocodeResult,
  ServiceabilityResult,
} from '@/types/marketplace-location';
import type {
  SearchCollectionsResponse,
  SearchPlatformResponse,
  SearchRecentResponse,
  SearchSuggestionsResponse,
  SearchTrendingResponse,
} from '@/types/marketplace-search';
import type { FoodMenuApiEnvelopeDTO } from '@bhojan/marketplace-contracts';
import type {
  FoodCategoriesResponse,
  FoodCollectionResponse,
  FoodMenuApiPayload,
} from '@/types/marketplace-food';
import type {
  RestaurantExperienceApiPayload,
  RestaurantGalleryResponse,
  RestaurantHighlightsResponse,
  RestaurantOffersResponse,
} from '@/types/marketplace-restaurant';

const MARKETPLACE_PREFIX = '/api/marketplace';

export class MarketplaceApiClient {
  constructor(private readonly http: MarketplaceHttpClient) {}

  health(): Promise<MarketplaceHealth> {
    return this.http.request<MarketplaceHealth>({
      path: `${MARKETPLACE_PREFIX}/health`,
    });
  }

  discover(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    rails?: string;
    limit?: number;
  }): Promise<DiscoverResponse> {
    return this.http.request<DiscoverResponse>({
      path: `${MARKETPLACE_PREFIX}/discover`,
      query: params,
    });
  }

  discoveryHome(
    query: Record<string, string | number | boolean>,
  ): Promise<DiscoveryHomeResponse> {
    return this.http.request<DiscoveryHomeResponse>({
      path: `${MARKETPLACE_PREFIX}/discovery`,
      query,
      bypassHttpCache: false,
    });
  }

  discoveryNearby(
    query: Record<string, string | number | boolean>,
  ): Promise<DiscoveryCollectionResponse> {
    return this.http.request<DiscoveryCollectionResponse>({
      path: `${MARKETPLACE_PREFIX}/discovery/nearby`,
      query,
      bypassHttpCache: false,
    });
  }

  discoveryFeatured(
    query: Record<string, string | number | boolean>,
  ): Promise<DiscoveryCollectionResponse> {
    return this.http.request<DiscoveryCollectionResponse>({
      path: `${MARKETPLACE_PREFIX}/discovery/featured`,
      query,
      bypassHttpCache: false,
    });
  }

  discoveryTrending(
    query: Record<string, string | number | boolean>,
  ): Promise<DiscoveryCollectionResponse> {
    return this.http.request<DiscoveryCollectionResponse>({
      path: `${MARKETPLACE_PREFIX}/discovery/trending`,
      query,
      bypassHttpCache: false,
    });
  }

  discoveryCloudKitchens(
    query: Record<string, string | number | boolean>,
  ): Promise<DiscoveryCollectionResponse> {
    return this.http.request<DiscoveryCollectionResponse>({
      path: `${MARKETPLACE_PREFIX}/discovery/cloud-kitchens`,
      query,
      bypassHttpCache: false,
    });
  }

  discoveryTopRated(
    query: Record<string, string | number | boolean>,
  ): Promise<DiscoveryCollectionResponse> {
    return this.http.request<DiscoveryCollectionResponse>({
      path: `${MARKETPLACE_PREFIX}/discovery/top-rated`,
      query,
      bypassHttpCache: false,
    });
  }

  discoveryOffers(
    query: Record<string, string | number | boolean>,
  ): Promise<DiscoveryCollectionResponse> {
    return this.http.request<DiscoveryCollectionResponse>({
      path: `${MARKETPLACE_PREFIX}/discovery/offers`,
      query,
      bypassHttpCache: false,
    });
  }

  discoveryCollection(
    collectionId: DiscoveryCollectionId,
    query: Record<string, string | number | boolean>,
  ): Promise<DiscoveryCollectionResponse> {
    const dedicated: Partial<Record<DiscoveryCollectionId, string>> = {
      nearby: `${MARKETPLACE_PREFIX}/discovery/nearby`,
      featured: `${MARKETPLACE_PREFIX}/discovery/featured`,
      trending: `${MARKETPLACE_PREFIX}/discovery/trending`,
      'cloud-kitchens': `${MARKETPLACE_PREFIX}/discovery/cloud-kitchens`,
      'top-rated': `${MARKETPLACE_PREFIX}/discovery/top-rated`,
      offers: `${MARKETPLACE_PREFIX}/discovery/offers`,
    };
    const path =
      dedicated[collectionId] ??
      `${MARKETPLACE_PREFIX}/discovery/${encodeURIComponent(collectionId)}`;
    return this.http.request<DiscoveryCollectionResponse>({
      path,
      query,
      bypassHttpCache: false,
    });
  }

  search(params: {
    q: string;
    type?: string;
    lat: number;
    lng: number;
    radiusKm?: number;
    limit?: number;
  }): Promise<SearchResponse> {
    return this.http.request<SearchResponse>({
      path: `${MARKETPLACE_PREFIX}/search`,
      query: { ...params, legacy: 'true' },
    });
  }

  searchPlatform(
    query: Record<string, string | number | boolean>,
  ): Promise<SearchPlatformResponse> {
    return this.http.request<SearchPlatformResponse>({
      path: `${MARKETPLACE_PREFIX}/search`,
      query,
    });
  }

  searchSuggestions(
    query: Record<string, string | number | boolean>,
  ): Promise<SearchSuggestionsResponse> {
    return this.http.request<SearchSuggestionsResponse>({
      path: `${MARKETPLACE_PREFIX}/search/suggestions`,
      query,
    });
  }

  searchTrending(
    query: Record<string, string | number | boolean>,
  ): Promise<SearchTrendingResponse> {
    return this.http.request<SearchTrendingResponse>({
      path: `${MARKETPLACE_PREFIX}/search/trending`,
      query,
    });
  }

  searchRecent(
    query: Record<string, string | number | boolean>,
  ): Promise<SearchRecentResponse> {
    return this.http.request<SearchRecentResponse>({
      path: `${MARKETPLACE_PREFIX}/search/recent`,
      query,
    });
  }

  searchCollections(
    query: Record<string, string | number | boolean>,
  ): Promise<SearchCollectionsResponse> {
    return this.http.request<SearchCollectionsResponse>({
      path: `${MARKETPLACE_PREFIX}/search/collections`,
      query,
    });
  }

  getRestaurant(
    restaurantSlug: string,
    params: { lat: number; lng: number },
  ): Promise<RestaurantDetailResponse> {
    return this.http.request<RestaurantDetailResponse>({
      path: `${MARKETPLACE_PREFIX}/restaurants/${encodeURIComponent(restaurantSlug)}`,
      query: { ...params, legacy: 'true' },
    });
  }

  restaurantExperience(
    restaurantSlug: string,
    params: { lat: number; lng: number },
  ): Promise<RestaurantExperienceApiPayload> {
    return this.http.request<RestaurantExperienceApiPayload>({
      path: `${MARKETPLACE_PREFIX}/restaurants/${encodeURIComponent(restaurantSlug)}`,
      query: params,
    });
  }

  restaurantGallery(restaurantSlug: string): Promise<RestaurantGalleryResponse> {
    return this.http.request<RestaurantGalleryResponse>({
      path: `${MARKETPLACE_PREFIX}/restaurants/${encodeURIComponent(restaurantSlug)}/gallery`,
    });
  }

  restaurantOffers(restaurantSlug: string): Promise<RestaurantOffersResponse> {
    return this.http.request<RestaurantOffersResponse>({
      path: `${MARKETPLACE_PREFIX}/restaurants/${encodeURIComponent(restaurantSlug)}/offers`,
    });
  }

  restaurantHighlights(restaurantSlug: string): Promise<RestaurantHighlightsResponse> {
    return this.http.request<RestaurantHighlightsResponse>({
      path: `${MARKETPLACE_PREFIX}/restaurants/${encodeURIComponent(restaurantSlug)}/highlights`,
    });
  }

  foodMenu(
    restaurantSlug: string,
    params?: { lat?: number; lng?: number },
  ): Promise<FoodMenuApiPayload> {
    return this.http.request<FoodMenuApiPayload>({
      path: `${MARKETPLACE_PREFIX}/restaurants/${encodeURIComponent(restaurantSlug)}/menu`,
      query: params,
    });
  }

  foodMenuContractV1(
    restaurantSlug: string,
    params?: { lat?: number; lng?: number },
  ): Promise<FoodMenuApiEnvelopeDTO> {
    return this.http.request<FoodMenuApiEnvelopeDTO>({
      path: `${MARKETPLACE_PREFIX}/restaurants/${encodeURIComponent(restaurantSlug)}/menu`,
      query: { ...params, schemaVersion: '1.0' },
    });
  }

  foodCategories(restaurantSlug: string): Promise<FoodCategoriesResponse> {
    return this.http.request<FoodCategoriesResponse>({
      path: `${MARKETPLACE_PREFIX}/restaurants/${encodeURIComponent(restaurantSlug)}/categories`,
    });
  }

  foodRecommended(restaurantSlug: string): Promise<FoodCollectionResponse> {
    return this.http.request<FoodCollectionResponse>({
      path: `${MARKETPLACE_PREFIX}/restaurants/${encodeURIComponent(restaurantSlug)}/recommended`,
    });
  }

  foodBestsellers(restaurantSlug: string): Promise<FoodCollectionResponse> {
    return this.http.request<FoodCollectionResponse>({
      path: `${MARKETPLACE_PREFIX}/restaurants/${encodeURIComponent(restaurantSlug)}/bestsellers`,
    });
  }

  getMenu(params: {
    restaurantId: string;
    contextToken: string;
  }): Promise<MenuResponse> {
    return this.http.request<MenuResponse>({
      path: `${MARKETPLACE_PREFIX}/menu`,
      query: params,
    });
  }

  quote(body: {
    restaurantId: string;
    contextToken: string;
    orderType: 'delivery' | 'pickup';
    lines: { itemId: string; quantity: number }[];
    deliveryAddress?: { lat: number; lng: number };
    couponCode?: string;
  }): Promise<BillQuote> {
    return this.http.request<BillQuote>({
      method: 'POST',
      path: `${MARKETPLACE_PREFIX}/quote`,
      body,
    });
  }

  checkoutPrepare(body: Record<string, unknown>): Promise<{ paymentMethods: string[]; quote: BillQuote }> {
    return this.http.request({
      method: 'POST',
      path: `${MARKETPLACE_PREFIX}/checkout/prepare`,
      body,
    });
  }

  checkoutPlace(body: Record<string, unknown>): Promise<{
    orderId?: string;
    draftId?: string;
    orderNumber?: number | string;
    upiUrl?: string;
    paymentMethod?: string;
  }> {
    return this.http.request({
      method: 'POST',
      path: `${MARKETPLACE_PREFIX}/checkout/place`,
      body,
    });
  }

  listOrders(): Promise<{ orders: OrderSummary[] }> {
    return this.http.request({
      path: `${MARKETPLACE_PREFIX}/orders`,
    });
  }

  getOrder(orderId: string): Promise<OrderSummary> {
    return this.http.request({
      path: `${MARKETPLACE_PREFIX}/orders/${encodeURIComponent(orderId)}`,
    });
  }

  getTracking(orderId: string): Promise<OrderTrackingResponse> {
    return this.http.request({
      path: `${MARKETPLACE_PREFIX}/orders/${encodeURIComponent(orderId)}/tracking`,
    });
  }

  getGuestTracking(orderId: string, phone: string): Promise<OrderTrackingResponse> {
    return this.http.request({
      path: `${MARKETPLACE_PREFIX}/orders/${encodeURIComponent(orderId)}/guest-tracking`,
      query: { phone },
    });
  }

  submitOrderFeedback(
    orderId: string,
    body: { rating: number; feedback?: string },
  ): Promise<OrderTrackingResponse | null> {
    return this.http.request({
      method: 'POST',
      path: `${MARKETPLACE_PREFIX}/orders/${encodeURIComponent(orderId)}/feedback`,
      body,
    });
  }

  validateCart(body: {
    restaurantId: string;
    contextToken: string;
    orderType: 'delivery' | 'pickup';
    lines: { itemId: string; quantity: number; unitPrice?: number }[];
    deliveryAddress?: { lat: number; lng: number };
    couponCode?: string;
  }): Promise<{
    valid: boolean;
    quote: BillQuote;
    issues: { itemId: string; code: string; message: string }[];
  }> {
    return this.http.request({
      method: 'POST',
      path: `${MARKETPLACE_PREFIX}/cart/validate`,
      body,
    });
  }

  getProfile(): Promise<CustomerProfile> {
    return this.http.request({
      path: `${MARKETPLACE_PREFIX}/profile`,
    });
  }

  updateProfile(body: Partial<CustomerProfile>): Promise<CustomerProfile> {
    return this.http.request({
      method: 'PATCH',
      path: `${MARKETPLACE_PREFIX}/profile`,
      body,
    });
  }

  listFavorites(): Promise<{ favorites: RestaurantPublic[] }> {
    return this.http.request({
      path: `${MARKETPLACE_PREFIX}/favorites`,
    });
  }

  addFavorite(restaurantId: string): Promise<{ favorites: RestaurantPublic[] }> {
    return this.http.request({
      method: 'POST',
      path: `${MARKETPLACE_PREFIX}/favorites`,
      body: { restaurantId },
    });
  }

  removeFavorite(restaurantId: string): Promise<{ favorites: RestaurantPublic[] }> {
    return this.http.request({
      method: 'DELETE',
      path: `${MARKETPLACE_PREFIX}/favorites/${encodeURIComponent(restaurantId)}`,
    });
  }

  registerNotificationToken(body: {
    token: string;
    platform: 'web' | 'ios' | 'android';
  }): Promise<{ registered: boolean }> {
    return this.http.request({
      method: 'POST',
      path: `${MARKETPLACE_PREFIX}/notifications/register`,
      body,
    });
  }

  locationReverseGeocode(params: {
    lat: number;
    lng: number;
    language?: string;
  }): Promise<ReverseGeocodeResult> {
    return this.http.request({
      path: `${MARKETPLACE_PREFIX}/location/reverse`,
      query: params,
    });
  }

  locationValidatePincode(params: {
    pincode: string;
    stateCode?: string;
  }): Promise<PincodeValidationResult> {
    return this.http.request({
      path: `${MARKETPLACE_PREFIX}/location/validate-pincode`,
      query: params,
    });
  }

  locationServiceability(body: {
    lat: number;
    lng: number;
    restaurantId?: string;
    contextToken?: string;
    orderType?: 'delivery' | 'pickup';
  }): Promise<ServiceabilityResult> {
    return this.http.request({
      method: 'POST',
      path: `${MARKETPLACE_PREFIX}/location/serviceability`,
      body,
    });
  }

  locationDeliveryZone(body: {
    lat: number;
    lng: number;
    restaurantId?: string;
  }): Promise<DeliveryZoneResult> {
    return this.http.request({
      method: 'POST',
      path: `${MARKETPLACE_PREFIX}/location/delivery-zone`,
      body,
    });
  }

  locationDistance(body: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  }): Promise<DistanceResult> {
    return this.http.request({
      method: 'POST',
      path: `${MARKETPLACE_PREFIX}/location/distance`,
      body,
    });
  }
}

let singleton: MarketplaceApiClient | null = null;
let authTokenProvider: (() => Promise<string | null>) | null = null;

export function setMarketplaceAuthTokenProvider(
  provider: (() => Promise<string | null>) | null,
): void {
  authTokenProvider = provider;
  singleton = null;
}

export function getMarketplaceApiClient(): MarketplaceApiClient {
  if (!singleton) {
    singleton = new MarketplaceApiClient(
      createMarketplaceHttpClient({
        getAuthToken: authTokenProvider ?? undefined,
      }),
    );
  }
  return singleton;
}

export function createMarketplaceApiClient(http?: MarketplaceHttpClient): MarketplaceApiClient {
  return new MarketplaceApiClient(http ?? createMarketplaceHttpClient());
}

export function resetMarketplaceApiClientForTests(): void {
  singleton = null;
}

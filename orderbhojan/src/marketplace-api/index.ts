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
  DeliveryZoneResult,
  DistanceResult,
  PincodeValidationResult,
  ReverseGeocodeResult,
  ServiceabilityResult,
} from '@/types/marketplace-location';

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
      query: params,
    });
  }

  getRestaurant(
    restaurantSlug: string,
    params: { lat: number; lng: number },
  ): Promise<RestaurantDetailResponse> {
    return this.http.request<RestaurantDetailResponse>({
      path: `${MARKETPLACE_PREFIX}/restaurants/${encodeURIComponent(restaurantSlug)}`,
      query: params,
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

  checkoutPlace(body: Record<string, unknown>): Promise<{ orderId: string }> {
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

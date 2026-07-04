import { http, HttpResponse } from 'msw';
import {
  MOCK_MENU,
  MOCK_QUOTE,
  MOCK_RESTAURANTS,
} from './fixtures';
import {
  buildDiscoveryCollection,
  buildDiscoveryHome,
  parseDiscoveryRequest,
} from './discoveryMockLogic';
import type { DiscoveryCollectionId } from '@/types/marketplace-discovery';
import {
  buildLegacyRestaurantDetail,
  buildRestaurantExperiencePayload,
  buildRestaurantGallery,
  buildRestaurantHighlights,
  buildRestaurantOffers,
} from './restaurantExperienceMockLogic';
import {
  buildLegacySearchResponse,
  buildSearchCollections,
  buildSearchPlatformResponse,
  buildSearchRecent,
  buildSearchSuggestions,
  buildSearchTrending,
  parseSearchQueryParams,
} from './searchMockLogic';

const prefix = '/api/marketplace';

function success<T>(value: T, correlationId = 'mock-correlation-id') {
  return HttpResponse.json({
    ok: true,
    value,
    meta: { correlationId },
  });
}

function unauthorized() {
  return HttpResponse.json(
    {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Bearer token required', retryable: false },
    },
    { status: 401 },
  );
}

function hasBearer(request: Request): boolean {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ');
}

export const marketplaceHandlers = [
  http.get(`${prefix}/health`, () =>
    success({
      status: 'ok',
      version: '1.0.0-m0',
      environment: 'mock',
    }),
  ),

  http.get(`${prefix}/discover`, ({ request }) => {
    const url = new URL(request.url);
    const railsParam = url.searchParams.get('rails') ?? 'nearby';
    const rails = railsParam.split(',').map((id) => ({
      id: id.trim(),
      title: id.trim().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      restaurants: MOCK_RESTAURANTS,
    }));
    return success({
      locationLabel: 'Demo Locality, Hyderabad',
      rails,
    });
  }),

  http.get(`${prefix}/discovery`, ({ request }) => {
    const params = parseDiscoveryRequest(new URL(request.url));
    return success(buildDiscoveryHome(params));
  }),

  http.get(`${prefix}/discovery/nearby`, ({ request }) => {
    const params = parseDiscoveryRequest(new URL(request.url));
    return success({ collection: buildDiscoveryCollection('nearby', params) });
  }),

  http.get(`${prefix}/discovery/featured`, ({ request }) => {
    const params = parseDiscoveryRequest(new URL(request.url));
    return success({ collection: buildDiscoveryCollection('featured', params) });
  }),

  http.get(`${prefix}/discovery/trending`, ({ request }) => {
    const params = parseDiscoveryRequest(new URL(request.url));
    return success({ collection: buildDiscoveryCollection('trending', params) });
  }),

  http.get(`${prefix}/discovery/cloud-kitchens`, ({ request }) => {
    const params = parseDiscoveryRequest(new URL(request.url));
    return success({ collection: buildDiscoveryCollection('cloud-kitchens', params) });
  }),

  http.get(`${prefix}/discovery/top-rated`, ({ request }) => {
    const params = parseDiscoveryRequest(new URL(request.url));
    return success({ collection: buildDiscoveryCollection('top-rated', params) });
  }),

  http.get(`${prefix}/discovery/offers`, ({ request }) => {
    const params = parseDiscoveryRequest(new URL(request.url));
    return success({ collection: buildDiscoveryCollection('offers', params) });
  }),

  http.get(`${prefix}/discovery/:collectionId`, ({ request, params }) => {
    const collectionId = String(params.collectionId) as DiscoveryCollectionId;
    const parsed = parseDiscoveryRequest(new URL(request.url));
    return success({ collection: buildDiscoveryCollection(collectionId, parsed) });
  }),

  http.get(`${prefix}/search`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('legacy') === 'true') {
      const q = url.searchParams.get('q') ?? '';
      return success(buildLegacySearchResponse(q));
    }
    const params = parseSearchQueryParams(url);
    return success(buildSearchPlatformResponse(params));
  }),

  http.get(`${prefix}/search/suggestions`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? '';
    return success(buildSearchSuggestions(q));
  }),

  http.get(`${prefix}/search/trending`, () => success(buildSearchTrending())),

  http.get(`${prefix}/search/recent`, () => success(buildSearchRecent())),

  http.get(`${prefix}/search/collections`, () => success(buildSearchCollections())),

  http.get(`${prefix}/restaurants/:slug`, ({ request, params }) => {
    const slug = String(params.slug);
    const url = new URL(request.url);
    if (url.searchParams.get('legacy') === 'true') {
      return success(buildLegacyRestaurantDetail(slug));
    }
    return success(buildRestaurantExperiencePayload(slug));
  }),

  http.get(`${prefix}/restaurants/:slug/gallery`, ({ params }) => {
    return success(buildRestaurantGallery(String(params.slug)));
  }),

  http.get(`${prefix}/restaurants/:slug/offers`, ({ params }) => {
    return success(buildRestaurantOffers(String(params.slug)));
  }),

  http.get(`${prefix}/restaurants/:slug/highlights`, ({ params }) => {
    return success(buildRestaurantHighlights(String(params.slug)));
  }),

  http.get(`${prefix}/menu`, () => success(MOCK_MENU)),

  http.post(`${prefix}/quote`, () => success(MOCK_QUOTE)),

  http.post(`${prefix}/checkout/prepare`, () =>
    success({
      paymentMethods: ['cod', 'razorpay'],
      quote: MOCK_QUOTE,
    }),
  ),

  http.post(`${prefix}/checkout/place`, () =>
    success({ orderId: 'ob_ord_mock_001' }),
  ),

  http.get(`${prefix}/orders`, ({ request }) => {
    if (!hasBearer(request)) return unauthorized();
    return success({
      orders: [
        {
          orderId: 'ob_ord_mock_001',
          restaurantId: MOCK_RESTAURANTS[0].restaurantId,
          displayName: MOCK_RESTAURANTS[0].displayName,
          status: 'DELIVERED',
          grandTotal: 269,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }),

  http.get(`${prefix}/orders/:orderId`, ({ params, request }) => {
    if (!hasBearer(request)) return unauthorized();
    return success({
      orderId: String(params.orderId),
      restaurantId: MOCK_RESTAURANTS[0].restaurantId,
      displayName: MOCK_RESTAURANTS[0].displayName,
      status: 'PREPARING',
      grandTotal: 269,
      createdAt: new Date().toISOString(),
    });
  }),

  http.get(`${prefix}/orders/:orderId/tracking`, ({ params, request }) => {
    if (!hasBearer(request)) return unauthorized();
    return success({
      orderId: String(params.orderId),
      status: 'PREPARING',
      timeline: [
        { status: 'PLACED', at: new Date(Date.now() - 600_000).toISOString() },
        { status: 'PREPARING', at: new Date().toISOString(), message: 'Kitchen is preparing your order' },
      ],
      etaMinutes: { min: 25, max: 35 },
    });
  }),

  http.get(`${prefix}/profile`, ({ request }) => {
    if (!hasBearer(request)) return unauthorized();
    return success({
      uid: 'mock-user-001',
      displayName: 'Demo Customer',
      email: 'demo@orderbhojan.com',
      phone: '9876543210',
    });
  }),

  http.patch(`${prefix}/profile`, async ({ request }) => {
    if (!hasBearer(request)) return unauthorized();
    const body = (await request.json()) as Record<string, string>;
    return success({
      uid: 'mock-user-001',
      displayName: body.displayName ?? 'Demo Customer',
      email: body.email ?? 'demo@orderbhojan.com',
      phone: body.phone ?? '9876543210',
    });
  }),

  http.get(`${prefix}/favorites`, ({ request }) => {
    if (!hasBearer(request)) return unauthorized();
    return success({ favorites: [MOCK_RESTAURANTS[0]] });
  }),

  http.post(`${prefix}/favorites`, ({ request }) => {
    if (!hasBearer(request)) return unauthorized();
    return success({ favorites: MOCK_RESTAURANTS.slice(0, 2) });
  }),

  http.delete(`${prefix}/favorites/:restaurantId`, ({ request }) => {
    if (!hasBearer(request)) return unauthorized();
    return success({ favorites: [] });
  }),

  http.post(`${prefix}/notifications/register`, ({ request }) => {
    if (!hasBearer(request)) return unauthorized();
    return success({ registered: true });
  }),

  http.get(`${prefix}/location/reverse`, ({ request }) => {
    const url = new URL(request.url);
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    const label =
      lat > 17 && lat < 18 && lng > 78 && lng < 79
        ? 'Gachibowli, Hyderabad'
        : lat > 18 && lat < 19 && lng > 72 && lng < 74
          ? 'Koregaon Park, Pune'
          : 'Demo Locality, India';
    return success({
      displayLabel: label,
      hints: {
        cityName: label.split(',')[1]?.trim() ?? 'Hyderabad',
        areaName: label.split(',')[0]?.trim(),
        pincode: '500032',
      },
      confidence: 'high',
    });
  }),

  http.get(`${prefix}/location/validate-pincode`, ({ request }) => {
    const url = new URL(request.url);
    const pincode = url.searchParams.get('pincode') ?? '';
    const valid = /^[1-9][0-9]{5}$/.test(pincode);
    return success({
      valid,
      stateCode: pincode.startsWith('5') ? 'TS' : 'MH',
      districtName: pincode.startsWith('5') ? 'Hyderabad' : 'Pune',
      cityName: pincode.startsWith('5') ? 'Hyderabad' : 'Pune',
      areas: valid
        ? [{ areaCode: 'demo-area', areaName: 'Demo Area' }]
        : [],
      message: valid ? undefined : 'Invalid pincode format',
    });
  }),

  http.post(`${prefix}/location/serviceability`, async ({ request }) => {
    const body = (await request.json()) as { lat: number; lng: number };
    const delivery = body.lat !== 0 && body.lng !== 0;
    return success({
      delivery,
      pickup: true,
      message: delivery ? 'Delivery available in your area' : 'Location required',
      distanceKm: delivery ? 3.2 : undefined,
      etaMinutes: delivery ? { min: 25, max: 35 } : undefined,
    });
  }),

  http.post(`${prefix}/location/delivery-zone`, async ({ request }) => {
    const body = (await request.json()) as { lat: number; lng: number };
    return success({
      inZone: body.lat !== 0,
      zoneLabel: 'Standard delivery',
      maxRadiusKm: 8,
    });
  }),

  http.post(`${prefix}/location/distance`, async ({ request }) => {
    const body = (await request.json()) as {
      origin: { lat: number; lng: number };
      destination: { lat: number; lng: number };
    };
    const dLat = body.destination.lat - body.origin.lat;
    const dLng = body.destination.lng - body.origin.lng;
    const distanceKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
    return success({
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes: { min: 20, max: 40 },
    });
  }),
];

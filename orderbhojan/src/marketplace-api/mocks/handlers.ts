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
  buildFoodBestsellers,
  buildFoodCategories,
  buildFoodMenuPayload,
  buildFoodMenuContractPayload,
  buildFoodRecommended,
  buildLegacyMenuResponse,
} from './foodExperienceMockLogic';
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

  http.get(`${prefix}/restaurants/:slug/menu`, ({ request, params }) => {
    const slug = String(params.slug);
    const url = new URL(request.url);
    if (url.searchParams.get('schemaVersion') === '1.0') {
      return success(buildFoodMenuContractPayload(slug));
    }
    return success(buildFoodMenuPayload(slug));
  }),

  http.get(`${prefix}/restaurants/:slug/categories`, ({ params }) => {
    return success(buildFoodCategories(String(params.slug)));
  }),

  http.get(`${prefix}/restaurants/:slug/recommended`, ({ params }) => {
    return success(buildFoodRecommended(String(params.slug)));
  }),

  http.get(`${prefix}/restaurants/:slug/bestsellers`, ({ params }) => {
    return success(buildFoodBestsellers(String(params.slug)));
  }),

  http.get(`${prefix}/menu`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('legacy') !== 'true') {
      return success(buildLegacyMenuResponse());
    }
    return success(MOCK_MENU);
  }),

  http.post(`${prefix}/quote`, () => success(MOCK_QUOTE)),

  http.post(`${prefix}/checkout/prepare`, () =>
    success({
      paymentMethods: ['cod', 'razorpay'],
      quote: MOCK_QUOTE,
    }),
  ),

  http.post(`${prefix}/checkout/place`, async ({ request }) => {
    const body = (await request.json()) as { paymentMethod?: string };
    if (body.paymentMethod === 'razorpay') {
      return success({ draftId: 'ob_draft_mock_001', orderNumber: 463577 });
    }
    if (body.paymentMethod === 'upi') {
      return success({
        orderId: 'ob_ord_upi_mock_001',
        orderNumber: 463577,
        paymentMethod: 'upi',
        upiUrl: 'upi://pay?pa=kitchen@paytm&pn=Mock&am=299&tr=ob_ord_upi_mock_001&cu=INR',
      });
    }
    return success({ orderId: 'ob_ord_mock_001', orderNumber: 463577 });
  }),

  http.post('/api/create-razorpay-order', async () =>
    HttpResponse.json({
      success: true,
      isMock: true,
      order: {
        id: `mock_order_${Date.now()}`,
        amount: MOCK_QUOTE.grandTotal * 100,
        currency: 'INR',
      },
      key: 'rzp_test_mock',
    }),
  ),

  http.post('/api/verify-razorpay-payment', async ({ request }) => {
    const body = (await request.json()) as { draftId?: string };
    return HttpResponse.json({
      success: true,
      verified: true,
      orderId: body.draftId ?? 'ob_draft_mock_001',
      orderNumber: 463577,
    });
  }),

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
      orderNumber: '463577',
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
      orderNumber: '463577',
      status: 'OUT_FOR_DELIVERY',
      timeline: [
        { status: 'PLACED', at: new Date(Date.now() - 900_000).toISOString() },
        { status: 'ACCEPTED', at: new Date(Date.now() - 700_000).toISOString() },
        { status: 'PREPARING', at: new Date(Date.now() - 500_000).toISOString() },
        { status: 'OUT_FOR_DELIVERY', at: new Date().toISOString(), message: 'Rider is on the way' },
      ],
      etaMinutes: { min: 10, max: 20 },
      restaurant: {
        displayName: MOCK_RESTAURANTS[0].displayName,
        slug: MOCK_RESTAURANTS[0].restaurantSlug,
        restaurantId: MOCK_RESTAURANTS[0].restaurantId,
      },
      delivery: {
        partner: 'Rapido',
        trackingUrl: 'https://rapido.bike/track/demo',
        riderName: 'Raju',
        riderPhone: '9876543210',
      },
      feedback: { eligible: false, submitted: false },
      reorder: {
        restaurantSlug: MOCK_RESTAURANTS[0].restaurantSlug,
        restaurantId: MOCK_RESTAURANTS[0].restaurantId,
        items: [{ itemId: 'biryani-1', name: 'Chicken biryani', quantity: 1, unitPrice: 249 }],
      },
    });
  }),

  http.post(`${prefix}/orders/:orderId/feedback`, async ({ params, request }) => {
    if (!hasBearer(request)) return unauthorized();
    const body = (await request.json()) as { rating?: number; feedback?: string };
    return success({
      orderId: String(params.orderId),
      status: 'DELIVERED',
      timeline: [
        { status: 'PLACED', at: new Date(Date.now() - 1_800_000).toISOString() },
        { status: 'DELIVERED', at: new Date().toISOString() },
      ],
      feedback: { eligible: true, submitted: true, rating: body.rating, comment: body.feedback },
    });
  }),

  http.get(`${prefix}/orders/:orderId/guest-tracking`, ({ params, request }) => {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone') ?? '';
    if (phone.replace(/\D/g, '').length < 4) {
      return HttpResponse.json(
        { ok: false, error: { code: 'INVALID', message: 'phone required' } },
        { status: 400 },
      );
    }
    return success({
      orderId: String(params.orderId),
      status: 'OUT_FOR_DELIVERY',
      timeline: [
        { status: 'PLACED', at: new Date(Date.now() - 900_000).toISOString() },
        { status: 'OUT_FOR_DELIVERY', at: new Date().toISOString(), message: 'Rider is on the way' },
      ],
      etaMinutes: { min: 10, max: 20 },
    });
  }),

  http.post(`${prefix}/cart/validate`, async ({ request }) => {
    const body = (await request.json()) as { lines?: { itemId: string }[] };
    const issues = (body.lines ?? [])
      .filter((line) => line.itemId === 'unavailable-item')
      .map((line) => ({
        itemId: line.itemId,
        code: 'UNAVAILABLE',
        message: 'Item is currently unavailable',
      }));
    return success({
      valid: issues.length === 0,
      quote: {
        subtotal: 199,
        gstAmount: 10,
        gstPercent: 5,
        packagingFee: 10,
        deliveryFee: 29,
        deliveryPending: false,
        discountAmount: 0,
        grandTotal: 248,
        taxLabel: 'GST',
        lineItems: [{ label: 'Subtotal', amount: 199 }],
      },
      issues,
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

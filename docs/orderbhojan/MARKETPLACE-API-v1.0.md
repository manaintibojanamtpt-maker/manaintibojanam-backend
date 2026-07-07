# OrderBhojan — Marketplace API v1.0

**Base URL (production):** `https://manaintibojanam-backend.onrender.com`  
**Prefix:** `/api/marketplace`  
**Status:** Contract draft — M0 mock · M3+ progressive implementation  
**Governance:** ADR-OB-001 · ADR-OB-002 · ADR-OB-003

---

## Principles

1. **Only** API surface OrderBhojan may call for commerce.
2. **Never** expose `tenantId`, `tenantSlug`, `branchId`, or Firestore paths.
3. **Server-authoritative** pricing on `/quote` and checkout paths.
4. Internally delegates to frozen BhojanOS SDKs.
5. Version via header: `X-Marketplace-API-Version: 1.0`.

---

## Authentication

| Context | Header |
|---------|--------|
| Authenticated customer | `Authorization: Bearer <Firebase ID Token (orderbhojan)>` |
| Guest | No Bearer; phone verified at checkout |
| Context binding | `X-Context-Token: <opaque>` (branch session) |
| Tracing | `X-Correlation-Id: <uuid>` |

---

## Public Types

```typescript
/** Customer-safe restaurant reference */
interface RestaurantPublic {
  restaurantId: string;       // opaque, e.g. obr_01H...
  restaurantSlug: string;     // URL-safe
  displayName: string;
  logoUrl?: string;
  coverUrl?: string;
  rating?: number;
  ratingCount?: number;
  cuisines: string[];
  priceForTwo?: number;
  distanceKm?: number;
  etaMinutes?: { min: number; max: number };
  deliveryFee?: number | null;  // null = pending (no location)
  isOpen: boolean;
  badges: ('veg' | 'pure_veg' | 'cloud_kitchen' | 'new' | 'offer')[];
}

interface BillQuote {
  subtotal: number;
  gstAmount: number;
  gstPercent: number;
  packagingFee: number;
  deliveryFee: number;
  deliveryPending: boolean;
  discountAmount: number;
  grandTotal: number;
  taxLabel: string;
  lineItems: { label: string; amount: number }[];
}

interface ApiSuccess<T> {
  ok: true;
  value: T;
  meta?: { correlationId: string; cached?: boolean };
}

interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    retryable?: boolean;
  };
}
```

---

## Endpoints

### Health

#### `GET /api/marketplace/health`

Marketplace layer status. M0 only.

---

### Discovery

#### `GET /api/marketplace/discover`

**Query**

| Param | Type | Description |
|-------|------|-------------|
| `lat` | number | Required |
| `lng` | number | Required |
| `radiusKm` | number | Default 10 |
| `rails` | string | Comma-separated: `nearby,featured,popular,top_rated,open_now,new,offers,veg,pure_veg,cloud_kitchen,quick_delivery` |
| `limit` | number | Per rail cap, default 12 |

**Response**

```typescript
{
  ok: true,
  value: {
    locationLabel?: string;
    rails: {
      id: string;
      title: string;
      restaurants: RestaurantPublic[];
    }[];
  }
}
```

**Internal:** DiscoverySDK + eligibility (`LIVE` only) + ranking.

---

### Search

#### `GET /api/marketplace/search`

**Query**

| Param | Description |
|-------|-------------|
| `q` | Search text |
| `type` | `all` \| `restaurant` \| `cuisine` \| `dish` \| `area` \| `locality` \| `pincode` \| `near_me` |
| `lat`, `lng` | Required for geo types |
| `radiusKm` | Optional |
| `limit` | Default 20 |

**Response:** `{ hits: SearchHit[]; facets?; meta: { provider: string } }`

SearchHit maps to `RestaurantPublic` or `DishHit` (dish includes `restaurantId`, never tenantId).

**Internal:** SearchProviderPort (ADR-OB-003).

---

### Restaurant

#### `GET /api/marketplace/restaurants/:restaurantSlug`

Detail page. Triggers branch assignment server-side.

**Query:** `lat`, `lng` (required for delivery context)

**Response**

```typescript
{
  restaurant: RestaurantPublic;
  contextToken: string;          // branch binding — opaque
  description?: string;
  hours?: { day: string; open: string; close: string }[];
  offers?: OfferPublic[];
  serviceability: {
    delivery: boolean;
    pickup: boolean;
    message?: string;
  };
}
```

---

### Menu

#### `GET /api/marketplace/menu`

**Query**

| Param | Required |
|-------|----------|
| `restaurantId` | yes |
| `contextToken` | yes |

**Response:** Categories, items, modifier groups — public IDs only (`itemId`, not Firestore doc paths).

---

### Quote (server authoritative)

#### `POST /api/marketplace/quote`

**Body**

```typescript
{
  restaurantId: string;
  contextToken: string;
  orderType: 'delivery' | 'pickup';
  lines: { itemId: string; quantity: number; modifiers?: ModifierSelection[] }[];
  deliveryAddress?: { lat: number; lng: number };
  couponCode?: string;
}
```

**Response:** `BillQuote`

**Rule:** UI renders response verbatim. No client recalculation.

---

### Cart validation (M7 — not persistent cart)

#### `POST /api/marketplace/cart/validate`

Validates availability and modifier rules. Returns adjusted lines or errors.

**ARB note:** Replaces originally proposed persistent `/cart` endpoint.

---

### Checkout

#### `POST /api/marketplace/checkout/prepare`

Returns payment methods + fresh quote.

#### `POST /api/marketplace/checkout/place`

Creates order. Returns `{ orderId, paymentSession? }`.

---

### Orders

#### `GET /api/marketplace/orders`

Authenticated list.

#### `GET /api/marketplace/orders/:orderId`

Detail — guest via phone + token.

---

### Tracking

#### `GET /api/marketplace/orders/:orderId/tracking`

Timeline + ETA. Driver location future flag.

---

### Profile

#### `GET /api/marketplace/profile`

BhojanOS user mirror for order linkage.

#### `PATCH /api/marketplace/profile`

Sync displayName, phone.

---

### Favorites

#### `GET /api/marketplace/favorites`

Returns validated `RestaurantPublic[]` for saved IDs.

#### `POST /api/marketplace/favorites`

Body: `{ restaurantId }` — validates LIVE status.

#### `DELETE /api/marketplace/favorites/:restaurantId`

**Note:** OrderBhojan Firestore remains SSOT; API validates on read.

---

### Notifications

#### `POST /api/marketplace/notifications/register`

Body: `{ token, platform }` — optional bridge to BhojanOS order webhooks.

---

## Error codes (sample)

| Code | HTTP | Meaning |
|------|------|---------|
| `LOCATION_REQUIRED` | 400 | lat/lng missing |
| `RESTAURANT_NOT_FOUND` | 404 | Invalid slug/id |
| `RESTAURANT_NOT_LIVE` | 403 | Not discoverable |
| `UNSERVICEABLE` | 422 | Out of delivery radius |
| `CONTEXT_INVALID` | 401 | contextToken expired |
| `MENU_STALE` | 409 | Item unavailable |
| `QUOTE_CHANGED` | 409 | Reprice required |

---

## BhojanOS implementation flag

`FF_MARKETPLACE_API_ENABLED` — default **OFF** until staging certification.

OrderBhojan env: `VITE_MARKETPLACE_API_URL` points to Render host.

---

## Gap register (implementation backlog)

| Endpoint | SDK readiness | Target milestone |
|----------|---------------|------------------|
| discover | DiscoverySDK (flags OFF) | M3 |
| search | SearchSDK partial | M4 |
| restaurant + context | Branch NOT_CONFIGURED | M5 |
| menu | Menu read via adapter | M6 |
| quote | Needs server quote service | M8 |
| checkout/place | Legacy order create | M8 |
| tracking | Existing order reads | M11 |

---

**Status:** Draft for M0 ARB · OpenAPI YAML to be generated in M0 implementation

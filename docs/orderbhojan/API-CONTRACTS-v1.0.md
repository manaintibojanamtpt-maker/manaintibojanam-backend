# OrderBhojan — BhojanOS API Contracts v1.0

**Status:** Draft — pending BhojanOS backend exposure review  
**Consumer:** OrderBhojan frontend only  
**Principle:** OrderBhojan never implements logic described here — only orchestrates

---

## Conventions

| Item | Value |
|------|-------|
| Base URL (prod) | `https://manaintibojanam-backend.onrender.com` |
| API prefix | `/api/v1/marketplace/*` (new surface) + existing legacy paths where frozen |
| Auth | `Authorization: Bearer <Firebase ID Token>` |
| Guest | No Bearer; `X-Guest-Phone`, `X-Guest-Token` on order reads |
| Correlation | `X-Correlation-Id: <uuid>` |
| Version | `X-BhojanOS-API-Version: 1.0` |
| Error shape | `{ ok: false, error: { code, message, layer, retryable? } }` |
| Success shape | `{ ok: true, value: T }` or legacy unwrapped (migration noted per endpoint) |

---

## 1. Discovery APIs

### `GET /api/v1/marketplace/discover`

Discover nearby restaurants (one card per tenant; nearest branch embedded).

**Query**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `lat` | number | yes | Customer latitude |
| `lng` | number | yes | Customer longitude |
| `radiusKm` | number | no | Default 10, max 25 |
| `limit` | number | no | Default 24, max 50 |
| `sortBy` | enum | no | `distance` \| `rating` \| `eta` \| `recommended` |
| `cuisine` | string | no | Filter slug |
| `vegOnly` | boolean | no | Filter |
| `offersOnly` | boolean | no | Filter |
| `openNow` | boolean | no | Filter |

**Response `DiscoveryResult`**

```typescript
interface DiscoveryResult {
  restaurants: RestaurantCard[];
  metadata: {
    correlationId: string;
    radiusKm: number;
    totalCandidates: number;
    fetchedAt: string; // ISO
  };
}

interface RestaurantCard {
  tenantId: string;
  slug: string;
  name: string;
  logoUrl?: string;
  coverUrl?: string;
  cuisines: string[];
  rating?: number;
  ratingCount?: number;
  priceForTwo?: number;
  distanceKm: number;
  etaMinutes: { min: number; max: number };
  isOpen: boolean;
  hasOffers: boolean;
  isVegFriendly?: boolean;
  assignedBranch: {
    branchId: string;
    distanceKm: number;
    serviceable: boolean;
  };
}
```

**BhojanOS mapping:** DiscoverySDK.discoverNearby → frozen M3 pipeline.

---

## 2. Search APIs

### `GET /api/v1/marketplace/search`

**Query**

| Param | Type | Required |
|-------|------|----------|
| `q` | string | yes (min 2) |
| `lat`, `lng` | number | yes |
| `radiusKm` | number | no |
| `limit` | number | no |

**Response:** `SearchResult` with `hits: SearchHit[]` enriched via Discovery intersection (M4 contract).

### `GET /api/v1/marketplace/search/autocomplete`

**Query:** `q` (prefix), `lat`, `lng`  
**Response:** `SearchSuggestion[]` — restaurants, cuisines, areas.

---

## 3. Branch APIs

### `POST /api/v1/branches/assign`

Select nearest serviceable branch for a tenant.

**Body**

```typescript
{
  tenantId: string;
  customerLat: number;
  customerLng: number;
  orderType: 'delivery' | 'pickup';
}
```

**Response**

```typescript
{
  tenantId: string;
  branchId: string;
  branchName?: string;      // internal; UI may hide
  distanceKm: number;
  etaMinutes: { min: number; max: number };
  serviceable: boolean;
  reason?: 'OUT_OF_RADIUS' | 'CLOSED' | 'NO_BRANCH';
}
```

**BhojanOS mapping:** BranchAssignmentEngine (M5).

---

## 4. Restaurant APIs

### `GET /api/v1/restaurants/:slug`

Public restaurant profile for marketplace detail page.

**Query:** `branchId` (optional — if omitted, server runs assign)

**Response:** `RestaurantDetail` — hours, description, offers, delivery config summary, assigned branch.

---

## 5. Menu APIs

### `GET /api/v1/menu`

**Query**

| Param | Required |
|-------|----------|
| `tenantId` | yes |
| `branchId` | yes |
| `includeUnavailable` | no (default false) |

**Response:** `MenuCatalog` — categories, items, modifier groups (M7 read model).

### `GET /api/v1/menu/items/:itemId`

Item detail with modifiers.

---

## 6. Pricing & Checkout APIs

### `POST /api/v1/pricing/quote`

Server-authoritative bill computation (GA-3 SSOT pattern).

**Body**

```typescript
{
  tenantId: string;
  branchId: string;
  lines: { menuItemId: string; quantity: number; modifiers?: ModifierSelection[] }[];
  customerLat?: number;
  customerLng?: number;
  orderType: 'delivery' | 'pickup';
  couponCode?: string;
}
```

**Response**

```typescript
{
  subtotal: number;
  gstAmount: number;
  gstPercent: number;
  packagingFee: number;
  deliveryFee: number;
  deliveryPending: boolean;
  discountAmount: number;
  grandTotal: number;
  taxLabel: string;
  freeDeliveryApplied: boolean;
}
```

### `POST /api/v1/checkout/prepare`

Validate cart + return payment methods + final quote.

### `POST /api/v1/checkout/place`

Create order (delegates to existing order creation pipeline).

**Body:** extends legacy checkout payload with `branchId`, `correlationId`.

---

## 7. Order APIs

### `POST /api/v1/orders`

Create order (authenticated or guest).

### `GET /api/v1/orders/:orderId`

Order detail — auth: owner token, guest token, or Bearer.

### `GET /api/v1/orders`

List orders for authenticated customer.

**Query:** `limit`, `cursor`, `status`

---

## 8. Tracking APIs

### `GET /api/v1/orders/:orderId/tracking`

**Response**

```typescript
{
  orderId: string;
  status: OrderStatus;
  timeline: { status: string; at: string; message?: string }[];
  etaMinutes?: { min: number; max: number };
  driver?: { lat: number; lng: number }; // future, flag-gated
}
```

### `GET /api/v1/orders/:orderId/tracking/stream`

Optional SSE/WebSocket — future milestone.

---

## 9. Customer APIs

### `PATCH /api/v1/customers/me`

Sync profile fields to BhojanOS user record (if dual-write required for orders).

**Body:** `{ displayName?, phone?, email? }`

---

## 10. Eligibility / Health

### `GET /api/v1/marketplace/eligibility/:tenantId`

Check if tenant is discoverable (debug/admin; not required for MVP UI).

### `GET /api/health`

Existing — platform build version, Firestore status.

---

## API Exposure Gap Analysis

| Capability | BhojanOS today | OrderBhojan need | Action |
|------------|----------------|------------------|--------|
| Discovery | SDK + facade (flags OFF) | HTTP discover | **M0:** Add marketplace router on Render |
| Search | SDK (partial) | HTTP search | **M3:** Expose search endpoints |
| Branch assign | SDK NOT_CONFIGURED | HTTP assign | **M4:** Implement M5 adapter + endpoint |
| Menu read | Firestore direct in storefront | HTTP menu | **M5:** Read adapter endpoint |
| Pricing quote | Client-side (legacy) | Server quote | **M7:** Mandatory for marketplace |
| Orders | Legacy API exists | Reuse + branchId | **M7:** Extend payload |

**M0 deliverable:** OpenAPI spec + mock server for OrderBhojan development without waiting for all endpoints.

---

## Versioning & Compatibility

- Breaking changes require `X-BhojanOS-API-Version` bump
- OrderBhojan pins minimum API version in config
- Deprecation window: 90 days with sunset header

---

**Status:** Draft for ARB + BhojanOS backend team review

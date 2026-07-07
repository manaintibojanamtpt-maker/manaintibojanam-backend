# OrderBhojan — BhojanOS API Contracts v1.0

> **Legacy draft — superseded for path conventions.**  
> **Canonical API surface:** [MARKETPLACE-API-v1.0.md](./MARKETPLACE-API-v1.0.md) (`/api/marketplace/*`, version via `X-BhojanOS-API-Version` header).  
> Resolved in [M0-ARB-REVIEW.md](./M0-ARB-REVIEW.md) §4 issue #2 — no `/api/v1/` in marketplace paths.

**Status:** Draft — historical reference only  
**Consumer:** OrderBhojan frontend only  
**Principle:** OrderBhojan never implements logic described here — only orchestrates

---

## Conventions

| Item | Value |
|------|-------|
| Base URL (prod) | `https://manaintibojanam-backend.onrender.com` |
| API prefix | `/api/marketplace/*` (Marketplace surface only — no version segment in path) |
| Auth | `Authorization: Bearer <Firebase ID Token>` |
| Guest | No Bearer; `X-Guest-Phone`, `X-Guest-Token` on order reads |
| Correlation | `X-Correlation-Id: <uuid>` |
| Version | `X-BhojanOS-API-Version: 1.0` |
| Error shape | `{ ok: false, error: { code, message, layer, retryable? } }` |
| Success shape | `{ ok: true, value: T }` or legacy unwrapped (migration noted per endpoint) |

Public DTOs use opaque `restaurantId` / `restaurantSlug` — never `tenantId` or `branchId` (ADR-OB-002). Branch assignment is server-side; clients use `contextToken` on quote/checkout.

---

## 1. Discovery APIs

### `GET /api/marketplace/discover`

Discover nearby restaurants (one card per brand; branch assignment server-only).

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
  restaurantId: string;
  restaurantSlug: string;
  displayName: string;
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
  serviceable: boolean;
}
```

**BhojanOS mapping:** DiscoverySDK.discoverNearby → frozen M3 pipeline.

---

## 2. Search APIs

### `GET /api/marketplace/search`

**Query**

| Param | Type | Required |
|-------|------|----------|
| `q` | string | yes (min 2) |
| `lat`, `lng` | number | yes |
| `radiusKm` | number | no |
| `limit` | number | no |

**Response:** `SearchResult` with `hits: SearchHit[]` enriched via Discovery intersection.

### `GET /api/marketplace/search/suggestions`

**Query:** `q` (prefix), `lat`, `lng`  
**Response:** `SearchSuggestion[]` — restaurants, cuisines, areas.

---

## 3. Branch resolution (server-only)

Branch assignment is **not** a customer-facing endpoint. On `GET /api/marketplace/restaurants/:restaurantSlug`, the server runs `BranchAssignmentService` and returns a signed `contextToken` binding branch + location for quote/checkout.

See [MARKETPLACE-API-v1.0.md](./MARKETPLACE-API-v1.0.md) § Restaurant.

---

## 4. Restaurant APIs

### `GET /api/marketplace/restaurants/:restaurantSlug`

Public restaurant profile for marketplace detail page. Server assigns branch invisibly.

**Query:** `lat`, `lng`, `orderType` (`delivery` \| `pickup`)

**Response:** `RestaurantDetail` — hours, description, offers, delivery config summary, `contextToken`, `serviceable`.

---

## 5. Menu APIs

### `GET /api/marketplace/menu`

**Query**

| Param | Required |
|-------|----------|
| `restaurantId` | yes |
| `contextToken` | yes |
| `includeUnavailable` | no (default false) |

**Response:** `MenuCatalog` — categories, items, modifier groups.

### `GET /api/marketplace/menu/items/:itemId`

Item detail with modifiers (same auth context as menu list).

---

## 6. Pricing & Checkout APIs

### `POST /api/marketplace/quote`

Server-authoritative bill computation (GA-3 SSOT pattern).

**Body**

```typescript
{
  restaurantId: string;
  contextToken: string;
  lines: { menuItemId: string; quantity: number; modifiers?: ModifierSelection[] }[];
  address?: CustomerAddressRef;
  orderType: 'delivery' | 'pickup';
  couponCode?: string;
}
```

**Response:** `BillQuoteDTO` — subtotal, taxes, fees, discounts, grandTotal (UI renders verbatim).

### `POST /api/marketplace/checkout/prepare`

Validate cart + return payment methods + final quote.

### `POST /api/marketplace/checkout/place`

Create order (delegates to existing order creation pipeline).

**Body:** extends checkout payload with `contextToken`, `correlationId`.

---

## 7. Order APIs

### `GET /api/marketplace/orders`

List orders for authenticated customer.

**Query:** `limit`, `cursor`, `status`

### `GET /api/marketplace/orders/:orderId`

Order detail — auth: owner token, guest token, or Bearer.

---

## 8. Tracking APIs

### `GET /api/marketplace/orders/:orderId/tracking`

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

Optional SSE/WebSocket — future milestone.

---

## 9. Customer APIs

### `GET /api/marketplace/profile`

### `PATCH /api/marketplace/profile`

Sync minimal profile fields (Marketplace DTO — not legacy `/api/v1/customers/me`).

---

## 10. Eligibility / Health

### `GET /api/marketplace/health`

Marketplace router health (stub in M0).

### `GET /api/health`

Existing platform health — build version, Firestore status.

---

## API Exposure Gap Analysis

| Capability | BhojanOS today | OrderBhojan need | Action |
|------------|----------------|------------------|--------|
| Discovery | SDK + facade (flags OFF) | HTTP discover | **M0:** Add marketplace router on Render |
| Search | SDK (partial) | HTTP search | **M4:** Expose search endpoints |
| Branch assign | Server-only | contextToken on restaurant | **M4:** BranchAssignmentService in Marketplace API |
| Menu read | Firestore direct in storefront | HTTP menu | **M5:** Read adapter endpoint |
| Pricing quote | Client-side (legacy) | Server quote | **M7:** Mandatory for marketplace |
| Orders | Legacy API exists | Marketplace orders routes | **M8+:** Extend via `/api/marketplace/orders` |

**M0 deliverable:** OpenAPI spec + mock server for OrderBhojan development without waiting for all endpoints.

---

## Versioning & Compatibility

- API version is carried in **`X-BhojanOS-API-Version`** header — not in URL path
- OrderBhojan pins minimum API version in config
- Deprecation window: 90 days with sunset header
- **Do not implement** `/api/v1/marketplace/*` — rejected at M0 ARB (issue #2)

---

**Status:** Legacy draft aligned to M0 ARB resolutions — prefer [MARKETPLACE-API-v1.0.md](./MARKETPLACE-API-v1.0.md) for implementation.

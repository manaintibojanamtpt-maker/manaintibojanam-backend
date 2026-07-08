# PX6.1 — Current Architecture Audit

**Program:** Owner Storefront Synchronization  
**Version:** 0.9.x-px61  
**Status:** Audit complete — **no code modified**

---

## Current data flow (as built)

```
BhojanOS Owner Dashboard
        ↓ (writes)
Firestore (tenants/{slug}, menu/{itemId}, categories/*, coupons/*)
        ↓ (NOT connected today)
        ✗  gap
        ↓
MSW Mock Layer (orderbhojan/src/marketplace-api/mocks/*)
        ↓
Marketplace API Client (typed HTTP)
        ↓
Experience Layers (food/restaurant/discovery/search engines)
        ↓
OrderBhojan UI (pure renderer — but fed by mocks)
```

**Parallel path (Home when discovery OFF):**

```
mockCatalog.ts  ──direct import──→  HomeExperiencePage
                                   (bypasses Marketplace API entirely)
```

---

## System boundaries

| Layer | Location | Role today | Owner-connected? |
|---|---|---|---|
| BhojanOS Owner | `src/pages/owner/*`, `server.ts` | CRUD tenant, menu, settings | Source of truth (partial) |
| Firestore | `tenants/`, `menu/`, `categories/`, `coupons/` | Persistence | Yes (owner writes) |
| Marketplace API (real) | OpenAPI spec + client | Contract defined | **No live Firestore backend** |
| MSW mocks | `orderbhojan/src/marketplace-api/mocks/` | Simulates API | **Invents all consumer data** |
| mockCatalog | `orderbhojan/src/features/experience/data/` | Home fallback | **Fully hardcoded** |
| Photo manifests | `food-photo-manifest.ts`, `restaurant-photo-manifest.ts` | Image URLs + captions | **Hardcoded Unsplash + captions** |
| UI formatters | `*/domain/formatters.ts` | Display derivation | **Fabricates labels** (% OFF, Open now) |

---

## OrderBhojan feature surfaces audited

| Surface | Data source | Hardcoded? |
|---|---|---|
| Home (discovery ON) | Discovery API → `discoveryFixtures.ts` | Yes (11 restaurants, collection rails) |
| Home (discovery OFF) | `mockCatalog.ts` direct | Yes (100%) |
| Restaurant Experience (PX5) | MSW → `fixtures.ts` + `restaurantExperienceMockLogic.ts` + photo manifest | Yes (offers, hours, highlights, gallery captions) |
| Food Experience (PX6) | MSW → `foodExperienceMockLogic.ts` + photo manifest | Yes (menu, addons, storytelling, badges) |
| Search | MSW → `searchMockLogic.ts` | Yes |
| Discovery filters | UI thresholds + mock pool | Partial (4.5+ rating, 3 km, ₹20 fee cap) |
| Cart preview (home) | `cartPreviewStore.ts` | Yes (₹249 default) |
| Location | MSW geocode + `india/reference.ts` | Yes (Hyderabad defaults) |

---

## BhojanOS Owner surfaces audited

| Owner page | Firestore touched | Consumer fields editable? |
|---|---|---|
| OnboardingWizard | `tenants`, seeds `menu` | Name, location, delivery, payments |
| OwnerMenu | `menu/{id}` via API | name, description, price, category string, type, image, isAvailable |
| OwnerSettings | `tenants` | branding, deliveryConfig, pricingConfig, location |
| StoreLiveControl | `tenants.storeOperations` | isStoreOpen, openTime, closeTime, offlineMessage |
| OwnerPromotionsPanel | `coupons` | Checkout codes (not marketplace offers) |
| OwnerMarketing | `campaigns` | WhatsApp/SMS campaigns |

**Not owner-editable today:** gallery, cover image, cuisines, per-day hours, food variants, food addons, labels, featured items, marketplace offers, category documents, storytelling fields.

---

## Architecture violations (Rule Zero)

1. **OrderBhojan invents business data** in MSW mocks and `mockCatalog.ts`.
2. **UI computes offer copy** (`17% OFF`) instead of rendering owner `offer.text`.
3. **Badge labels are hardcoded English** (`Bestseller`, `Chef recommended`) from booleans.
4. **Gallery images and captions** come from static manifest, not owner uploads.
5. **Featured / today's specials** derived by mock logic, not owner curation.
6. **COMMON_ADDONS** attached to every dish regardless of owner configuration.
7. **Restaurant description, hours, policies, highlights** are template strings in mocks.
8. **Two inconsistent restaurant pools** (4 in fixtures, 11 in discovery, different prices/offers).

---

## Target architecture (PX6.1)

```
Owner Dashboard
        ↓
Firestore (extended only where required)
        ↓
Marketplace API projection layer (server.ts or dedicated service)
        ↓
RestaurantDTO / CategoryDTO / FoodDTO
        ↓
OrderBhojan Renderer (conditional render only)
```

OrderBhojan rule: `if (dto.offer?.enabled) renderOffer(dto.offer.text) else renderNothing()`

---

## Risk summary

| Risk | Severity | Notes |
|---|---|---|
| Dual restaurant pools | High | Discovery vs fixtures price/offer conflicts |
| Owner API strips menu fields | High | `normalizeMenuItemPayload` drops addons, labels |
| Categories admin-only in rules | High | Owner cannot manage category documents |
| No Firestore → Marketplace handlers | Critical | All consumer data is mock |
| Photo manifest vs owner images | Medium | Owner uploads base64; OB uses Unsplash |
| Formatter-derived offers | Medium | Will show wrong copy even after price sync |
| Direct mockCatalog import | Medium | Home bypasses API when discovery off |

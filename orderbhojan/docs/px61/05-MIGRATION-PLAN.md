# PX6.1 — Migration Plan

**Phases:** Audit ✅ → Schema alignment → API projection → Renderer refactor → Mock removal → Verification

**No breaking feature flags:** `FF_OB_HOME`, `FF_OB_RESTAURANT`, `FF_OB_MENU`, `FF_OB_SEARCH` remain.

---

## Phase 0 — Audit (complete)

- [x] Current architecture audit
- [x] Hardcoded value inventory
- [x] Firestore mapping
- [x] DTO mapping
- [ ] **CEO approval to proceed to Phase 1**

---

## Phase 1 — BhojanOS Owner schema & UI (Platform team)

**Goal:** Owner can configure every consumer field.

| Task | Owner surface | Firestore |
|---|---|---|
| 1.1 Restaurant description, cuisines | OwnerSettings → Storefront tab | `tenants.marketplace` |
| 1.2 Cover image + gallery upload | OwnerSettings → Media | `tenants.marketplace.gallery[]` |
| 1.3 Marketplace offers (not checkout coupons) | OwnerPromotions → Storefront offers | `tenants.marketplace.offers[]` |
| 1.4 Per-weekday business hours | StoreLiveControl extension | `tenants.marketplace.businessHours[]` |
| 1.5 Highlights & policies CMS | OwnerSettings → Storefront | `tenants.marketplace.highlights/policies` |
| 1.6 Category CRUD | New OwnerCategories page | `categories/{id}` + rules update |
| 1.7 Menu item extensions | OwnerMenu form expansion | `menu` extended fields |
| 1.8 Labels multi-select | OwnerMenu → Labels | `menu.labels[]` |
| 1.9 Variants editor | OwnerMenu → Sizes | `menu.variants[]` |
| 1.10 Addons editor (per item) | OwnerMenu → Add-ons | `menu.addons[]` |
| 1.11 Food offer editor | OwnerMenu → Offer | `menu.offer` |
| 1.12 Featured / today's specials picker | OwnerMenu → Merchandising | `tenants.marketplace.featuredFoodIds` |
| 1.13 Fix `normalizeMenuItemPayload` | `server.ts` | Pass-through extended fields |
| 1.14 Category rules | `firestore.rules` | Owner write on own tenant categories |

**Exit criteria:** Owner can CRUD all fields in synchronization matrix without admin.

---

## Phase 2 — Marketplace API projection layer

**Goal:** Firestore → DTO mappers replace mock logic.

| Task | Location | Notes |
|---|---|---|
| 2.1 `RestaurantProjectionService` | `server.ts` or `src/domain/marketplace/` | tenants → RestaurantPublic |
| 2.2 `FoodMenuProjectionService` | Same | menu + categories → FoodMenuResponse |
| 2.3 Status engine | Shared | open/closing_soon/closed from hours + manual toggle |
| 2.4 Delivery/ETA calculator | Shared | deliveryConfig + user coords |
| 2.5 Wire `/restaurants/:slug/menu` to Firestore | Replace MSW handler | Behind `FF_OB_FIRESTORE_MENU` |
| 2.6 Wire `/restaurants/:slug` experience | Replace MSW handler | Behind `FF_OB_FIRESTORE_RESTAURANT` |
| 2.7 Unify restaurant pool | Single tenant query | Remove discoveryFixtures duplication |
| 2.8 Image CDN pipeline | Storage URLs | Replace base64 in docs with public URLs |

**Exit criteria:** `demo-biryani-house` (or real tenant slug) served from Firestore end-to-end in staging.

---

## Phase 3 — OrderBhojan renderer refactor

**Goal:** Pure renderer — no fabrication.

| Task | File(s) | Change |
|---|---|---|
| 3.1 Add `FoodOffer` + `labels[]` to types | `marketplace-food.ts` | DTO evolution |
| 3.2 Remove `formatOfferLabel()` math | `food/domain/formatters.ts` | Render `offer.text` only |
| 3.3 Replace boolean badges | `FoodCardItem`, `FoodFeaturedPoster` | `labels.includes()` + display map from API |
| 3.4 Remove COMMON_ADDONS | `foodExperienceMockLogic.ts` | Per-item addons from API |
| 3.5 Remove mockCatalog home path | `HomeExperiencePage` | Always discovery API (or Firestore feed) |
| 3.6 Gallery from DTO | `RestaurantGalleryRail` | Remove manifest captions as source |
| 3.7 Food photos from DTO | `FoodCardItem` | `food.images[]` not manifest map |
| 3.8 Wire unused type fields | Restaurant page | `ratingCount`, `priceRange`, `todayHours` OR remove |
| 3.9 Deprecate photo manifest business use | Keep BlurHash pipeline, owner URLs as input | Manifest becomes fallback only |
| 3.10 Remove direct mock imports from UI | All features | API-only data path |

**Exit criteria:** Grep for `placehold.co`, `mockCatalog`, `COMMON_ADDONS`, `formatOfferLabel` returns zero in consumer path.

---

## Phase 4 — Mock removal & cleanup

| Task | Action |
|---|---|
| 4.1 Archive MSW mocks | Keep for unit tests only, not default dev |
| 4.2 Consolidate fixtures | Single test fixture factory |
| 4.3 Update MSW handlers | Proxy to real API in dev when flag on |
| 4.4 Migration docs | Owner-facing "what appears on OrderBhojan" guide |

---

## Phase 5 — Verification

| Test | Method |
|---|---|
| Owner price change → OB update | E2E: edit menu in Owner, reload OB menu |
| Owner enable/disable offer | E2E offer visibility |
| Owner label change | E2E badge text |
| Missing field graceful fallback | Integration test + console warning |
| Performance regression | Bundle + LCP smoke |
| BDS certification | 100% adoption maintained |
| Zero hardcoded grep | CI gate script |

---

## Proposed feature flags (non-breaking)

| Flag | Purpose | Default |
|---|---|---|
| `FF_OB_FIRESTORE_MENU` | Menu from Firestore vs MSW | `false` |
| `FF_OB_FIRESTORE_RESTAURANT` | Restaurant from Firestore vs MSW | `false` |
| `FF_OB_FIRESTORE_DISCOVERY` | Discovery from Firestore vs fixtures | `false` |

Existing flags unchanged.

---

## Timeline estimate

| Phase | Effort | Dependency |
|---|---|---|
| Phase 1 (Owner) | 2–3 sprints | — |
| Phase 2 (API) | 1–2 sprints | Phase 1 partial (menu basics) |
| Phase 3 (Renderer) | 1 sprint | Phase 2 menu + restaurant |
| Phase 4 (Cleanup) | 0.5 sprint | Phase 3 |
| Phase 5 (Verification) | 0.5 sprint | All |

**Parallel track:** Phase 3.1–3.3 (DTO + formatter refactor) can start once DTO shape is agreed, with MSW emitting new shape first.

---

## Implementation status

**DEFERRED** — awaiting audit approval and Phase 1 Owner schema work.

No code was modified during this audit.

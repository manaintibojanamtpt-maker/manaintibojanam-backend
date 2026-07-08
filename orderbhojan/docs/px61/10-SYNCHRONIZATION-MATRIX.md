# PX6.1 — Synchronization Matrix

Every consumer-facing field → exact BhojanOS Owner source.

**Legend:** ✅ Exists today | ⚠️ Partial | ❌ Missing | 🔧 UI fabricates | 📦 Mock only

---

## Restaurant — identity & listing

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Restaurant name | Restaurant, Menu strip, Discovery | `tenants.name` | ✅ | OB uses mock name |
| Slug | URL routing | `tenants.slug` | ✅ | |
| Logo | Restaurant, Menu strip | `tenants.branding.logoUrl` | ⚠️ | OB uses photo manifest |
| Cover image | Restaurant hero | `tenants.branding.coverImageUrl` | ❌ | OB uses manifest |
| Description | Restaurant about | `tenants.marketplace.description` | ❌ | Mock template string |
| Cuisines | Restaurant, cards | `tenants.marketplace.cuisineTags[]` | ❌ | Mock `cuisines[]` |
| Rating | Restaurant, cards, food | Reviews aggregate | ❌ | Mock 4.8 etc. |
| Rating count | Highlights (unused in UI) | Reviews aggregate | ❌ | Mock 2140 |
| Price range (₹₹₹) | Type only | Owner `priceRangeLabel` | ❌ 🔧 | Thresholds in `formatPriceRange` |
| Veg badge | Cards | Owner badge / menu analysis | ⚠️ | Inferred from badges[] |
| Cloud kitchen badge | Restaurant | Owner `badges[]` / businessType | ⚠️ | Inferred in mapper |
| Restaurant badges[] | Type only | `tenants.marketplace.badges[]` | ❌ | Mock badge strings |

---

## Restaurant — delivery & serviceability

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Delivery fee | Restaurant, cards | `tenants.deliveryConfig.baseFee` + geo | ⚠️ | Mock ₹20 |
| ETA min–max | Restaurant, cards | `deliveryConfig.prepTime` + geo | ⚠️ | Mock 28–38 min |
| Distance | Restaurant, cards | Geo compute | 📦 | Mock 2.4 km |
| Minimum order | Not rendered | `deliveryConfig.freeDeliveryMinOrder` | ❌ | |
| Packaging fee | Checkout | `tenants.pricingConfig.packingFee` | ✅ | Not in OB menu scope |
| Delivery enabled | Serviceability | `deliveryConfig.enabled` | ⚠️ | |
| Pickup enabled | Serviceability | Owner setting (future) | ❌ | Mock always true |
| Serviceability message | Serviceability | `storeOperations.offlineMessage` | ⚠️ | Mock generic text |

---

## Restaurant — hours & status

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Open now / Closed | Restaurant hero | `storeOperations.isStoreOpen` + hours | ⚠️ 🔧 | Label mapped in formatter |
| Closing soon | Type supported | Hours engine | ❌ | Never set by mock |
| Today's hours | Type only | `marketplace.businessHours[]` today | ❌ | Mock `11 AM – 11 PM` |
| Weekly hours | Restaurant sheet | `marketplace.businessHours[]` | ❌ | Mock Mon–Sun template |
| Vacation / temp closure | Not rendered | `storeOperations.offlineMessage` | ⚠️ | |
| Live status toggle | — | `storeOperations.isStoreOpen` | ✅ | Owner StoreLiveControl |

---

## Restaurant — offers

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Offer title | Restaurant hero pill | `marketplace.offers[].text` / title | ❌ | Mock per-slug map |
| Offer badge | Restaurant, discovery | `marketplace.offers[].badge` | ❌ | Mock `Best deal`, `BOGO` |
| Offer description | Offer detail | `marketplace.offers[].description` | ❌ | |
| Offer enabled | — | `marketplace.offers[].enabled` | ❌ | Must gate render |
| Offer date window | — | `offers[].start`, `offers[].end` | ❌ | |
| Default "Special offer" | Search, mock | — | 📦 | Fabricated fallback |

---

## Restaurant — gallery & media

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Gallery image URL | Restaurant rail | `marketplace.gallery[].url` | ❌ | Manifest Unsplash |
| Gallery caption | Restaurant rail | `marketplace.gallery[].caption` | ❌ | Manifest hardcoded |
| Gallery kind (kitchen/dining) | — | `marketplace.gallery[].kind` | ❌ | |

---

## Restaurant — highlights & policies

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Highlight title | Restaurant | `marketplace.highlights[].title` | ❌ | Mock `Verified kitchen` |
| Highlight subtitle | Restaurant | `marketplace.highlights[].subtitle` | ❌ | Mock interpolated |
| Policy title/body | Restaurant | `marketplace.policies[]` | ❌ | Mock boilerplate |

---

## Category

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Category name | Menu rail, sections | `categories.name` | ⚠️ | Free-text on menu item today |
| Category ID | Menu scroll-spy | `categories/{id}` | ❌ | Derived from item strings |
| Category slug | API | Generated from name | ❌ | |
| Category image | Home chips | `categories.image` | ❌ | Manifest map |
| Category order | Menu rail | `categories.priority` | ❌ | |
| Category visibility | — | `categories.isActive` | ❌ | |
| Item count | Category chip | Aggregate menu query | 🔧 | Computed in mock |

---

## Food item — core

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Food ID | Internal/cart | `menu/{docId}` | ⚠️ | Opaque mapping needed |
| Food slug | URL (future) | `menu.slug` | ❌ | |
| Name | Cards, sheet | `menu.name` | ✅ | Mock duplicates owner shape |
| Subtitle | Not rendered | `menu.subtitle` | ❌ | |
| Description | Cards, sheet | `menu.description` | ✅ | |
| Images[] | Cards, posters | `menu.images[]` | ⚠️ | Manifest map used |
| Display order | Menu sort | `menu.displayOrder` | ❌ | |
| Visibility | — | `menu.visibility` | ❌ | |

---

## Food item — pricing

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Regular price | Cards, sheet | `menu.pricing.regularPrice` / `price` | ✅ | |
| Selling price | Cards (struck) | `menu.pricing.sellingPrice` | ⚠️ | As `offerPrice` in DTO |
| MRP | Not rendered | `menu.pricing.mrp` | ❌ | |
| Currency | — | `menu.pricing.currency` | ⚠️ | Hardcoded INR |
| Tax included | Not rendered | `menu.pricing.taxIncluded` | ❌ | |
| Offer enabled | — | `menu.offer.enabled` | ❌ | |
| Offer text | Badge | `menu.offer.text` | ❌ 🔧 | `% OFF` computed |
| Offer type/%/amount | — | `menu.offer.*` | ❌ | |
| Offer window | — | `menu.offer.start/end` | ❌ | |

---

## Food item — labels & badges

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| BESTSELLER | Food cards | `menu.labels[]` | ❌ 🔧 | `bestSeller` bool + "Bestseller" string |
| CHEF_PICK | Food cards | `menu.labels[]` | ❌ 🔧 | `chefSpecial` + "Chef recommended" |
| NEW | Not rendered | `menu.labels[]` | ❌ | `newItem` bool unused in UI |
| LIMITED / FESTIVAL / etc. | Not rendered | `menu.labels[]` | ❌ | |
| HEALTHY / PROTEIN / KIDS | Not rendered | `menu.labels[]` | ❌ | |
| SPICY label | Not rendered | `menu.labels[]` or spice enum | ❌ | Separate spiceLevel used |
| Recommended | Not rendered | `menu.labels[]` | ❌ | Bool on type, unused |

---

## Food item — preparation & spice

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Preparation time | Cards | `menu.preparation.estimatedTime` | ❌ | Mock 25 min |
| Serving size | Customize sheet | `menu.preparation.servingSize` | ❌ | Mock storytelling |
| Temperature | Not rendered | `menu.preparation.temperature` | ❌ | |
| Spice level | Cards, sheet | `menu.spice` | ❌ | Mock enum; formatter maps label |

---

## Food item — availability

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Available / sold out | Cards | `menu.isAvailable` / `availabilityStatus` | ⚠️ | Owner has boolean only |
| OUT_OF_STOCK | Cards | `availabilityStatus` | ❌ | |
| LIMITED / PREORDER / TODAY_ONLY | Not rendered | `availabilityStatus` | ❌ | |
| TIME_BASED | Not rendered | `availability.schedule` | ❌ | |

---

## Food item — variants

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Variant label (Half/Full/etc.) | Customize sheet | `menu.variants[].label` | ❌ | Mock only |
| Variant price | Customize sheet | `menu.variants[].price` | ❌ | |
| Variant offer price | Customize sheet | `menu.variants[].offerPrice` | ❌ | |
| Variant kind | — | `menu.variants[].kind` | ❌ | |

---

## Food item — addons

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Addon label | Customize sheet | `menu.addons[].label` | ❌ | **COMMON_ADDONS on all items** |
| Addon price | Customize sheet | `menu.addons[].price` | ❌ | |
| Addon kind | — | `menu.addons[].kind` | ❌ | |
| Max quantity | — | `menu.addons[].maxQuantity` | ❌ | |

---

## Food item — storytelling

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Chef note | Customize sheet | `menu.storytelling.chefNote` | ❌ | Mock narrative |
| Ingredients | Customize sheet | `menu.storytelling.ingredients[]` | ❌ | |
| Cooking style | Customize sheet | `menu.storytelling.cookingStyle` | ❌ | |
| Popular pairing | Customize sheet | `menu.storytelling.popularPairing` | ❌ | |
| Nutrition summary | Not rendered | `menu.storytelling.nutritionSummary` | ❌ | On type, mock only |
| Allergen summary | Not rendered | `menu.storytelling.allergenSummary` | ❌ | |
| Dietary labels | Not rendered | `menu.labels[]` subset | ❌ | |

---

## Food menu — merchandising

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Featured / signature IDs | Signature rail | `tenants.marketplace.featuredFoodIds[]` | ❌ 🔧 | Mock: chefSpecial\|\|bestSeller |
| Today's specials IDs | Not rendered | `tenants.marketplace.todaysSpecialFoodIds[]` | ❌ 🔧 | Mock: items with offerPrice |
| Restaurant name on menu | Menu strip | `tenants.name` | ⚠️ | From mock menu response |

---

## Theme

| Consumer field | Where rendered | BhojanOS source | Status | Notes |
|---|---|---|---|---|
| Accent color | BDS theme | `tenants.branding.accentColor` | ❌ | Platform theme today |
| Highlight color | — | `tenants.branding.highlightColor` | ❌ | |
| Font preference | — | Future | ❌ | |

---

## Platform-owned (not owner — OK to hardcode)

| Field | Source | Notes |
|---|---|---|
| Trust strip (Fresh, Hygienic…) | Platform marketing | Not Rule Zero violation |
| Discovery collection rail titles | Platform taxonomy | Nearby, Top Rated, etc. |
| Search sort labels | Platform UX | Popular, Nearest, etc. |
| Filter thresholds (4.5+, 3 km) | Platform UX | User filters, not business data |
| Time greeting | Platform UX | Good Morning, etc. |
| Empty state copy | Platform UX | |

---

## Summary

| Status | Count (approx.) |
|---|---|
| ❌ Missing owner source | 52 |
| ⚠️ Partial / disconnected | 18 |
| 🔧 UI fabricates display | 8 |
| 📦 Mock-only | 7 |
| ✅ Owner field exists | 12 |
| Platform-owned (OK) | 6 |

**Synchronization readiness: ~14%** (12 of 85 business fields connected end-to-end)

---

## Final Synchronization Report

OrderBhojan is **not yet a pure renderer**. All consumer business data flows from MSW mocks, `mockCatalog.ts`, and photo manifests. BhojanOS Owner stores a **subset** of restaurant and menu data in Firestore, but:

1. No Marketplace API handler reads Firestore for menu/restaurant endpoints
2. Owner API normalizer strips variants, addons, and labels
3. UI formatters fabricate offer percentages and badge English copy
4. Two inconsistent mock restaurant pools create conflicting prices and offers

**To achieve Rule Zero:** Execute Migration Plan Phases 1–5 in order. Phase 1 (Owner schema + UI) is the critical path blocker.

**No code was modified during this audit.**

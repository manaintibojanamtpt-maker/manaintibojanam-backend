# PX6.1 — Hardcoded Value Inventory

**Audit rule:** Every consumer-visible business value.  
**Columns:** File | Line | Current Value | Expected Source | Migration Strategy | Risk

---

## A. Restaurant identity & listing

| File | Line | Current Value | Expected Source | Migration Strategy | Risk |
|---|---|---|---|---|---|
| `mocks/fixtures.ts` | 8–71 | 4 restaurants: names, ratings, cuisines, priceForTwo, ETA, deliveryFee, badges | `tenants/{slug}` profile projection | Firestore → `RestaurantPublic` mapper | High |
| `mocks/discoveryFixtures.ts` | 3–195 | 11 restaurants (7 discovery-only), placehold.co images | Same + discovery index | Unify pool; single source | High |
| `mocks/fixtures.ts` | 17 vs `discoveryFixtures` | Mana Inti priceForTwo **449 vs 499** | Owner pricing tier | Single projection | High |
| `experience/data/mockCatalog.ts` | 79–149 | Featured restaurants with pre-formatted `eta`, `deliveryFee`, `offer` strings | `RestaurantPublic` + formatters | Remove string literals; use API | High |
| `experience/data/mockCatalog.ts` | 98 | Demo Biryani offer **Flat ₹75 OFF** | Owner offer | Conflicts with restaurant mock 50% OFF | High |
| `restaurant/data/restaurant-photo-manifest.ts` | 27–66 | Gallery captions (`Live kitchen`, `Chef at work`) | Owner gallery upload metadata | Owner `gallery[].caption` | Med |
| `restaurant/data/restaurant-photo-manifest.ts` | 68 | Default slug fallback `demo-biryani-house` | N/A (graceful empty) | Log warning; empty gallery | Low |
| `features/experience/data/food-photo-manifest.ts` | 33–204 | Unsplash URLs for cover/logo | `tenants.branding.logoUrl`, owner cover | Owner media URLs in DTO | Med |

---

## B. Offers & discounts

| File | Line | Current Value | Expected Source | Migration Strategy | Risk |
|---|---|---|---|---|---|
| `mocks/restaurantExperienceMockLogic.ts` | 14–48 | Per-slug offers: `50% OFF up to ₹100`, `BOGO`, `Flat ₹40 OFF` | `tenants.offers[]` or `food.offer` | New owner offer model | High |
| `mocks/restaurantExperienceMockLogic.ts` | 42–48 | Default `Special offer available` | Nothing if disabled | Conditional render | Med |
| `food/domain/formatters.ts` | 8–11 | Computes `17% OFF` from price math | `food.offer.text` when enabled | Add `FoodOffer` DTO; remove math | **Critical** |
| `experience/data/mockCatalog.ts` | 52–77 | Hero banners: `Free Delivery Weekend`, ₹299 threshold | Owner campaign banners | Owner banner config or hide | Med |
| `mocks/searchMockLogic.ts` | 330–341 | Offer results: `Special offer available` | Owner offer text | API projection | Med |
| `discovery/ui/DiscoveryRestaurantCard.tsx` | ~65 | Generic badge `"Offer"` | `restaurant.offers[0].badge` | Render owner badge | Med |

---

## C. Badges & labels

| File | Line | Current Value | Expected Source | Migration Strategy | Risk |
|---|---|---|---|---|---|
| `mocks/foodExperienceMockLogic.ts` | 49–50 | `bestSeller: true`, `chefSpecial: true` inline | `food.labels[]` includes `BESTSELLER`, `CHEF_PICK` | Owner label picker | High |
| `mocks/foodExperienceMockLogic.ts` | 94 | `newItem: true` on kebab | `labels: ['NEW']` | Owner labels | Med |
| `food/ui/FoodCardItem.tsx` | 51–52 | Hardcoded `"Bestseller"`, `"Chef recommended"` | Owner label display map | `labels.includes('BESTSELLER')` → owner text | **Critical** |
| `food/ui/FoodFeaturedPoster.tsx` | 65–66 | Same hardcoded badge strings | Owner labels | Same | **Critical** |
| `mocks/fixtures.ts` | 22 | `badges: ['offer', 'new']` | Owner restaurant badges | Owner badge config | Med |
| `restaurant/ui/RestaurantExperiencePage.tsx` | 116–124 | `"Cloud kitchen"` / `"Verified kitchen"` | Owner badges / verification | Render `experience.badges[]` | Med |
| `types/marketplace-food.ts` | 46–49 | Booleans: bestSeller, chefSpecial, newItem, recommended | Replace with `labels: FoodLabel[]` | DTO evolution + compat shim | High |

---

## D. Delivery, ETA, distance

| File | Line | Current Value | Expected Source | Migration Strategy | Risk |
|---|---|---|---|---|---|
| `mocks/fixtures.ts` | 19–20 | ETA 25–35 min, delivery ₹20 | `tenants.deliveryConfig` + geo calc | Compute in API from owner prepTime/fees | High |
| `mocks/handlers.ts` | 325–334 | Serviceability ETA 25–35, distance 3.2 km | Location service + deliveryConfig | Real projection | Med |
| `restaurant/domain/formatters.ts` | 3–15 | Formats ETA/fee strings | Acceptable **display only** if source is DTO | Keep formatters; fix source | Low |
| `experience/data/mockCatalog.ts` | 84–86 | `eta: '25–35 min'`, `deliveryFee: '₹20'` as strings | Numeric DTO fields | Use shared formatters | High |
| `mocks/discoveryMockLogic.ts` | 169–170 | Default coords Hyderabad 17.4401, 78.3489 | User location | Keep user geo; not owner | Low |

---

## E. Ratings & social proof

| File | Line | Current Value | Expected Source | Migration Strategy | Risk |
|---|---|---|---|---|---|
| `mocks/fixtures.ts` | 14–15 | rating 4.8, ratingCount 2140 | Review aggregate / owner-disabled | External rating source | Med |
| `mocks/restaurantExperienceMockLogic.ts` | 90–94 | Highlights: `{ratingCount}+ ratings`, `{eta.min} min avg` | Owner highlights CMS | Owner `highlights[]` | Med |
| `restaurant/ui/RestaurantExperiencePage.tsx` | — | `ratingCount`, `priceRange` on type but **not rendered** | Owner fields | Wire or remove from type | Low |

---

## F. Business hours & availability

| File | Line | Current Value | Expected Source | Migration Strategy | Risk |
|---|---|---|---|---|---|
| `mocks/restaurantExperienceMockLogic.ts` | 59–60 | `todayHours: '11:00 AM – 11:00 PM'` all restaurants | `tenants.storeOperations` + weekly schedule | Owner hours model | High |
| `mocks/restaurantExperienceMockLogic.ts` | 70–72 | Mon–Sun 11 AM–11 PM | Owner `businessHours[]` | Per-day owner config | High |
| `restaurant/domain/formatters.ts` | 18–27 | Maps enum → `"Open now"` / `"Closed"` | `restaurant.businessStatus` | Owner status + display label | Med |
| `mapRestaurantPublicToExperience` | 142 | `openStatus` from `isOpen` only | `storeOperations.isStoreOpen` + hours | Real-time projection | Med |

---

## G. Menu — food items

| File | Line | Current Value | Expected Source | Migration Strategy | Risk |
|---|---|---|---|---|---|
| `mocks/foodExperienceMockLogic.ts` | 11–18 | **COMMON_ADDONS** (6 addons on every item) | Per-item owner addons | Owner addon CRUD | **Critical** |
| `mocks/foodExperienceMockLogic.ts` | 35–153 | 9 dishes: prices, offers, storytelling, spice | `menu/{itemId}` extended schema | Firestore projection | High |
| `mocks/foodExperienceMockLogic.ts` | 51–56 | Variants Half/Full/500gm/1kg with prices | Owner `variants[]` | New owner UI + API | High |
| `mocks/foodExperienceMockLogic.ts` | 232 | `featuredIds = chefSpecial \|\| bestSeller` | Owner curated featured list | Owner merchandising | Med |
| `mocks/foodExperienceMockLogic.ts` | 233 | `todaysSpecialIds = items with offerPrice` | Owner today's specials | Owner selection | Med |
| `food/data/food-item-photo-manifest.ts` | 10–20 | foodId → Unsplash asset map | `food.images[]` from owner | Owner image URLs | Med |
| `experience/data/mockCatalog.ts` | 152–190 | Trending dishes + oldPrice strike-through | Owner menu + offers | API trending collection | Med |

---

## H. Categories

| File | Line | Current Value | Expected Source | Migration Strategy | Risk |
|---|---|---|---|---|---|
| `mocks/foodExperienceMockLogic.ts` | 214–227 | Categories derived from item.categoryId strings | `categories/{id}` owner docs | Owner category CRUD | High |
| `experience/data/mockCatalog.ts` | 39–49 | 9 home food categories with emoji | Owner/platform taxonomy | Discovery categories API | Med |
| `food-photo-manifest.ts` | 279–288 | Category chip → Unsplash photo map | `category.image` from owner | Owner category image | Med |

---

## I. Policies, description, highlights

| File | Line | Current Value | Expected Source | Migration Strategy | Risk |
|---|---|---|---|---|---|
| `mocks/restaurantExperienceMockLogic.ts` | 62–64 | Description template with interpolated cuisines | Owner `description` | Owner text field | High |
| `mocks/restaurantExperienceMockLogic.ts` | 78–88 | Packaging/allergen policy boilerplate | Owner `policies[]` | Owner CMS | Med |
| `mocks/restaurantExperienceMockLogic.ts` | 90–94 | `Verified kitchen`, `Popular for biryani` | Owner `highlights[]` | Owner highlights | Med |

---

## J. Search & discovery rails

| File | Line | Current Value | Expected Source | Migration Strategy | Risk |
|---|---|---|---|---|---|
| `discovery/domain/collections.ts` | 11–32 | 20 collection titles (`Fast Delivery`, `Offers & Deals`) | Platform config (not owner) | Platform-owned OK | Low |
| `mocks/searchMockLogic.ts` | 18–51 | 4 hardcoded food search hits | Owner menu index | Search index from Firestore | Med |
| `mocks/searchMockLogic.ts` | 443–472 | Trending queries with counts | Analytics (future) | Out of PX6.1 scope | Low |
| `discovery/ui/DiscoveryFiltersBar.tsx` | 69–93 | 4.5+ rating, 3 km, low fee ≤₹20 | Platform filter UX | Keep as UI filters | Low |

---

## K. UI fabrication (formatters — not mock data but violates Rule Zero for labels)

| File | Line | Current Value | Expected Source | Migration Strategy | Risk |
|---|---|---|---|---|---|
| `food/domain/formatters.ts` | 8–11 | `% OFF` computed | `offer.text` | DTO field | **Critical** |
| `types/marketplace-restaurant.ts` | 147–152 | priceRange ₹/₹₹/₹₹₹ thresholds | Owner `priceRangeLabel` | Owner-set or remove | Med |
| `discovery/utils/restaurantDisplay.ts` | 20–25 | Duplicate price range logic | Same | Centralize owner value | Med |
| `experience/ui/home/HomeExperiencePage.tsx` | 31–37 | Trust strip: Fresh, Hygienic, Verified | Platform marketing | Platform OK (not owner) | Low |

---

## Summary counts

| Category | Hardcoded sources | Items |
|---|---|---|
| Restaurant records | fixtures + discoveryFixtures + mockCatalog | 11 unique slugs (inconsistent) |
| Menu items | foodExperienceMockLogic | 9 items / 2 slugs |
| Global addons | COMMON_ADDONS | 6 (forced on all items) |
| Restaurant offers | restaurantExperienceMockLogic | 4 slug maps + 1 default |
| Gallery captions | restaurant-photo-manifest | 3–4 per slug |
| Business hours | restaurantExperienceMockLogic | 1 template (all restaurants) |
| Fabricated offer labels | formatters.ts | All % OFF badges |

**Total consumer business fields requiring owner sync:** ~85+ distinct field paths (see Synchronization Matrix).

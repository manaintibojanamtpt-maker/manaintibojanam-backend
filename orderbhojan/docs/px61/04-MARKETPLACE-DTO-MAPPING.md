# PX6.1 — Marketplace DTO Mapping

Target DTOs are defined in `orderbhojan/src/types/`.  
Projection layer transforms Firestore → DTO. OrderBhojan renders DTO only.

---

## RestaurantDTO chain

```
tenants/{slug}
    → RestaurantPublic (discovery/listing)
    → RestaurantExperiencePublic (detail page)
    → RestaurantExperienceResponse (+ hours, serviceability, policies, highlights)
```

### RestaurantPublic (`marketplace.ts`)

| DTO field | Firestore / computed source | Transform |
|---|---|---|
| `restaurantId` | Hash(slug) or mapping table | Opaque ID generator |
| `restaurantSlug` | `tenants.slug` | Direct |
| `displayName` | `tenants.name` | Direct |
| `logoUrl` | `branding.logoUrl` | CDN normalize |
| `coverUrl` | `branding.coverImageUrl` | CDN normalize |
| `rating` | Reviews aggregate | External service |
| `ratingCount` | Reviews aggregate | External service |
| `cuisines[]` | `marketplace.cuisineTags` | Direct |
| `priceForTwo` | Owner-set or computed median | Owner field or derive |
| `distanceKm` | Geo(user, tenant.location) | Runtime compute |
| `etaMinutes.{min,max}` | `deliveryConfig.prepTime` + distance | Runtime compute |
| `deliveryFee` | `deliveryConfig` + distance | Runtime compute |
| `isOpen` | `storeOperations` + `businessHours` | Status engine |
| `badges[]` | `marketplace.badges` + derived verification | Owner + system |

### RestaurantExperiencePublic (`marketplace-restaurant.ts`)

| DTO field | Source | Notes |
|---|---|---|
| All RestaurantPublic mapped fields | Same | Via `mapRestaurantPublicToExperience` (keep, fix inputs) |
| `priceRange` | Owner `priceRangeLabel` OR remove | **Stop threshold fabrication** |
| `todayHours` | Computed from `businessHours` for today | Owner hours |
| `gallery[]` | `marketplace.gallery[]` | Owner uploads |
| `description` | `marketplace.description` | Owner text |
| `offers[]` | `marketplace.offers[]` where `enabled && inWindow` | Filter disabled |
| `openStatus` | Status engine | `open` / `closed` / `closing_soon` |

### RestaurantExperienceResponse (envelope)

| DTO field | Source |
|---|---|
| `hours[]` | `marketplace.businessHours[]` |
| `serviceability` | `deliveryConfig` + geo + `isStoreOpen` |
| `policies[]` | `marketplace.policies[]` |
| `highlights[]` | `marketplace.highlights[]` |

---

## CategoryDTO

### FoodCategoryPublic (`marketplace-food.ts`)

| DTO field | Source | Transform |
|---|---|---|
| `id` | `categories/{id}` doc id | Opaque |
| `slug` | Generated from name | kebab-case |
| `name` | `categories.name` | Direct |
| `itemCount` | Count `menu` where `categoryId` matches | Aggregate query |

---

## FoodDTO

### FoodPublic (`marketplace-food.ts`) — target shape evolution

| DTO field (current) | PX6.1 source | Migration note |
|---|---|---|
| `foodId` | `menu/{id}` doc id (opaque) | Direct |
| `slug` | `menu.slug` or generated | Direct |
| `name` | `menu.name` | Direct |
| `description` | `menu.description` | Direct |
| `image` | `menu.images[0]` | CDN URL |
| `price` | `menu.pricing.regularPrice` | Direct |
| `offerPrice` | `menu.pricing.sellingPrice` if `offer.enabled` | Conditional |
| `currency` | `menu.pricing.currency` default INR | Direct |
| `category` | `categories.name` join | Lookup |
| `categoryId` | `menu.categoryId` | Direct |
| `rating` | Reviews per item | External |
| `dietary` | `menu.type` mapped to veg/nonVeg/egg | Enum map |
| `preparationTime` | `menu.preparation.estimatedTime` | Direct |
| `availability` | `availabilityStatus !== OUT_OF_STOCK` | Status map |
| `bestSeller`, `chefSpecial`, `newItem`, `recommended` | **DEPRECATE** → `labels[]` | Compat shim during migration |
| `labels[]` | `menu.labels[]` | **NEW primary** |
| `variants[]` | `menu.variants[]` | Direct |
| `addons[]` | `menu.addons[]` | Direct (per item, not global) |
| Storytelling fields | `menu.storytelling.*` | Direct |
| `spiceLevel` | `menu.spice` enum mapped | Enum map |
| `dietaryLabels[]` | Owner `labels` subset (HEALTHY, PROTEIN, etc.) | Filter |

### FoodOffer (proposed addition to FoodPublic)

```typescript
interface FoodOffer {
  readonly enabled: boolean;
  readonly type?: string;
  readonly percentage?: number;
  readonly amount?: number;
  readonly text?: string;      // ONLY render when enabled
  readonly start?: string;
  readonly end?: string;
}
```

Replaces `formatOfferLabel()` percentage math.

### FoodMenuResponse

| DTO field | Source |
|---|---|
| `slug` | `tenants.slug` |
| `restaurantName` | `tenants.name` |
| `categories[]` | `categories` query by tenantId |
| `items[]` | `menu` query by tenantId, sorted by displayOrder |
| `featuredIds[]` | `marketplace.featuredFoodIds` |
| `todaysSpecialIds[]` | `marketplace.todaysSpecialFoodIds` |

---

## Renderer rules (OrderBhojan)

| Condition | Render | Never |
|---|---|---|
| `food.offer?.enabled === true` | `food.offer.text` | Compute `% OFF` |
| `food.labels.includes('BESTSELLER')` | Owner label display map | Hardcode `"Bestseller"` |
| `restaurant.offers.filter(enabled)` | Offer badges/titles | Default `"Special offer"` |
| `food.availabilityStatus === 'OUT_OF_STOCK'` | Sold-out state | Assume available |
| Missing gallery | Empty section | Manifest fallback (log warning) |
| Missing offer | Nothing | Fabricate discount |

---

## API endpoints (existing contract → Firestore backend)

| Endpoint | DTO returned | Firestore queries |
|---|---|---|
| `GET /restaurants/:slug` | `RestaurantExperienceResponse` | `tenants/{slug}` + projection |
| `GET /restaurants/:slug/menu` | `FoodMenuResponse` | `menu` + `categories` by tenantId |
| `GET /restaurants/:slug/categories` | `FoodCategoriesResponse` | `categories` by tenantId |
| `GET /discover/*` | `RestaurantPublic[]` | Tenant index + geo |
| `GET /restaurants/:slug/gallery` | `RestaurantGalleryResponse` | `marketplace.gallery` |
| `GET /restaurants/:slug/offers` | `RestaurantOffersResponse` | `marketplace.offers` filtered |

MSW handlers in `handlers.ts` remain during migration behind feature flag `FF_OB_FIRESTORE_SYNC` (proposed).

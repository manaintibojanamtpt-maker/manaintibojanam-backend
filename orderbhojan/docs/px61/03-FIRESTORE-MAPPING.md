# PX6.1 — Firestore Mapping

Maps BhojanOS Owner Firestore documents to consumer-facing needs.  
**Principle:** Reuse existing collections; extend only where genuinely required.

---

## Collections (existing)

### `tenants/{slug}` — Restaurant profile root

| Firestore path | Owner editable today | PX6.1 consumer need | Action |
|---|---|---|---|
| `name` | ✅ Onboarding, Settings | `RestaurantPublic.displayName` | **Map as-is** |
| `slug` | ✅ Provision | `RestaurantPublic.restaurantSlug` | **Map as-is** |
| `branding.logoUrl` / `brandConfig.logoUrl` | ✅ Settings | `RestaurantPublic.logoUrl` | **Normalize naming** |
| `location.{address,city,state,pincode,lat,lng}` | ✅ Settings | Distance/ETA computation input | **Map as-is** |
| `deliveryConfig.{baseFee,perKmCharge,prepTime,maxRadius,freeRadius,paidRadius,freeDeliveryMinOrder}` | ✅ Settings | `deliveryFee`, `eta` (computed) | **Project in API** |
| `pricingConfig.packingFee` | ✅ Settings | `RestaurantPolicy` packaging | **Map to policies[]** |
| `storeOperations.{isStoreOpen,businessHoursEnabled,openTime,closeTime,offlineMessage}` | ✅ StoreLiveControl | `openStatus`, `todayHours` | **Partial — single window only** |
| `paymentConfig` | ✅ Settings | Not consumer menu scope | Skip |
| `kyc`, `fssai`, `legal` | ✅ Wizard | Trust badges (future) | Phase 2 |
| `description` | ❌ Not in Settings UI | `RestaurantExperiencePublic.description` | **Add owner field** |
| `cuisineTags[]` | ❌ Rarely set | `RestaurantPublic.cuisines[]` | **Add owner editor** |
| `ratingAggregate` | ❌ Not owner-managed | `rating`, `ratingCount` | External/reviews service |
| `coverImageUrl` | ❌ Missing | `RestaurantPublic.coverUrl` | **Add owner upload** |
| `gallery[]` | ❌ Missing | `RestaurantGalleryImage[]` | **New subcollection or array** |
| `theme.{accentColor,highlightColor}` | ⚠️ `settings.theme` only | Theme tokens (future) | **Extend branding** |
| `offers[]` (marketplace) | ❌ Missing | `RestaurantOffer[]` | **New embedded array** |
| `businessHours[]` (per weekday) | ❌ Missing | `RestaurantOperatingHour[]` | **Extend storeOperations** |
| `highlights[]` | ❌ Missing | `RestaurantHighlight[]` | **New owner CMS** |
| `policies[]` | ❌ Missing | `RestaurantPolicy[]` | **New owner CMS** |
| `minimumOrder` | ❌ Missing | Serviceability message | **Add to deliveryConfig** |
| `badges[]` (structured) | ❌ Inferred from businessType | `RestaurantPublic.badges[]` | **Owner badge picker** |

### `menu/{itemId}` — Food items

| Firestore path | Owner editable today | PX6.1 consumer need | Action |
|---|---|---|---|
| `tenantId` | ✅ | Internal mapping to slug | **Never expose** |
| `name` | ✅ OwnerMenu | `FoodPublic.name` | **Map as-is** |
| `description` | ✅ | `FoodPublic.description` | **Map as-is** |
| `price` | ✅ | `FoodPublic.pricing.regularPrice` | **Map as-is** |
| `category` (string) | ✅ free-text | `FoodPublic.category` | **Map until categoryId ready** |
| `type` / `isVegetarian` | ✅ | `FoodPublic.dietary` | **Map veg/nonVeg/egg** |
| `isAvailable` | ✅ | `FoodPublic.availability` | **Map as-is** |
| `image` | ✅ base64 | `FoodPublic.images[0]` | **CDN URL pipeline** |
| `discount` | ⚠️ Type exists, not in owner form | `offer.sellingPrice` | **Align with offer model** |
| `isPopular`, `isBestSeller` | ❌ Not in owner API | `labels[]` | **Replace with labels** |
| `addons[]` | ❌ Type exists, API strips | `FoodPublic.addons[]` | **Expose in owner UI + API** |
| `rating` | ❌ Optional in seed | `FoodPublic.rating` | Reviews aggregate |
| `variants[]` | ❌ Missing | `FoodPublic.variants[]` | **New embedded array** |
| `labels[]` | ❌ Missing | BESTSELLER, CHEF_PICK, etc. | **New owner multi-select** |
| `offer.{enabled,type,percentage,amount,text,...}` | ❌ Missing | Conditional offer render | **New embedded object** |
| `preparation.{estimatedTime,servingSize,temperature}` | ❌ Missing | `preparationTime`, `servingSize` | **New embedded object** |
| `spice` | ❌ Missing | `FoodPublic.spiceLevel` | **New enum field** |
| `availabilityStatus` | ❌ Missing | AVAILABLE/OUT_OF_STOCK/LIMITED/etc. | **Extend beyond boolean** |
| `chefNote`, `ingredients[]`, `cookingStyle`, `popularPairing` | ❌ Missing | Storytelling fields | **New optional fields** |
| `displayOrder`, `visibility` | ❌ Missing | Menu sort / hide | **New fields** |
| `slug` | ❌ Missing | `FoodPublic.slug` | **Generate from name** |

### `categories/{categoryId}` — Menu categories

| Firestore path | Owner editable today | PX6.1 consumer need | Action |
|---|---|---|---|
| `name` | ❌ Admin-only rules | `FoodCategoryPublic.name` | **Owner write access** |
| `priority` | ❌ | Category order | **Owner sort** |
| `image` | ❌ | Category rail image | **Owner upload** |
| `isActive`, `showOnHome` | ❌ | Visibility | **Owner toggle** |
| `tenantId` | ⚠️ Used in queries | Filter by restaurant | **Required** |

### `coupons/{couponId}` — Checkout coupons (NOT marketplace offers)

| Firestore path | Owner editable today | PX6.1 consumer need | Action |
|---|---|---|---|
| `code`, `discountType`, `discountValue` | ⚠️ Owner UI (rules block) | Checkout only | **Do not map to consumer offer badges** |
| — | — | `RestaurantOffer` narrative promos | **Separate `tenants.offers[]` or `promotions/`** |

---

## Proposed extensions (minimal new schema)

### On `tenants/{slug}` (embedded)

```typescript
// New / extended fields — only if not satisfiable by existing
marketplace?: {
  description?: string;
  cuisineTags?: string[];
  coverImageUrl?: string;
  gallery?: Array<{ id: string; url: string; caption?: string; kind?: string }>;
  offers?: Array<{
    id: string;
    enabled: boolean;
    type: 'percentage' | 'flat' | 'bogo' | 'free_delivery' | 'custom';
    percentage?: number;
    amount?: number;
    text: string;           // consumer-visible ONLY when enabled
    badge?: string;
    start?: Timestamp;
    end?: Timestamp;
    priority?: number;
  }>;
  highlights?: Array<{ id: string; title: string; subtitle?: string }>;
  policies?: Array<{ id: string; title: string; body: string }>;
  businessHours?: Array<{ day: string; open: string; close: string; closed?: boolean }>;
  badges?: string[];        // BESTSELLER at restaurant level if needed
  featuredFoodIds?: string[];
  todaysSpecialFoodIds?: string[];
};
branding?: {
  logoUrl?: string;
  coverImageUrl?: string;
  accentColor?: string;
  highlightColor?: string;
};
```

### On `menu/{itemId}` (embedded)

```typescript
categoryId?: string;        // FK to categories/{id}
slug?: string;
displayOrder?: number;
visibility?: 'visible' | 'hidden';
labels?: string[];          // BESTSELLER | CHEF_PICK | NEW | ...
offer?: {
  enabled: boolean;
  type: string;
  percentage?: number;
  amount?: number;
  text?: string;            // "20% OFF" — owner-authored
  start?: Timestamp;
  end?: Timestamp;
};
pricing?: {
  regularPrice: number;
  sellingPrice?: number;
  mrp?: number;
  currency: string;
  taxIncluded?: boolean;
};
variants?: Array<{ id: string; kind: string; label: string; price: number; offerPrice?: number }>;
addons?: Array<{ id: string; kind: string; label: string; price: number; maxQuantity?: number }>;
preparation?: { estimatedTime?: number; servingSize?: string; temperature?: string };
spice?: 'NONE' | 'MILD' | 'MEDIUM' | 'HOT' | 'EXTRA_HOT';
availabilityStatus?: 'AVAILABLE' | 'OUT_OF_STOCK' | 'LIMITED' | 'PREORDER' | 'TODAY_ONLY' | 'TIME_BASED';
storytelling?: {
  chefNote?: string;
  ingredients?: string[];
  cookingStyle?: string;
  popularPairing?: string;
  nutritionSummary?: string;
  allergenSummary?: string;
};
images?: string[];
```

---

## Firestore rules impact

| Collection | Current write | PX6.1 need |
|---|---|---|
| `tenants/{slug}` | Owner update | Extend allowed fields |
| `menu/{itemId}` | Owner write | Allow extended payload |
| `categories/{id}` | **Admin only** | **Owner write scoped to tenantId** |
| `coupons/{id}` | **Admin only** | Fix rules OR route via server API |

---

## ID mapping

| Internal | Public |
|---|---|
| Firestore doc id / `tenantId` | Never expose |
| `tenants.slug` | `RestaurantPublic.restaurantSlug` |
| Opaque `restaurantId` | Generated stable public ID (existing ADR) |
| `menu/{itemId}` doc id | `FoodPublic.foodId` (opaque) |
| `categories/{categoryId}` | `FoodCategoryPublic.id` |

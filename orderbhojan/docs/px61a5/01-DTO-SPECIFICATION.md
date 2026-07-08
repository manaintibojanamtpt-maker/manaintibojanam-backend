# 01 — DTO Specification (v1.0)

Immutable public contracts. All fields `readonly` at consumption.  
**No React. No Firestore IDs. No UI formatting. No computed strings. No mock data.**

Every top-level DTO includes `schemaVersion: "1.0"`.

Shared primitives defined first.

---

## Shared primitives

### ImageDTO v1.0

```typescript
interface ImageDTO {
  readonly schemaVersion: '1.0';
  readonly assetId: string;          // opaque public asset ID — NOT Firestore path
  readonly url: string;              // HTTPS CDN URL — owner-origin media only
  readonly width?: number;           // pixels, optional
  readonly height?: number;
  readonly blurHash?: string;        // optional placeholder hash
  readonly alt?: string;             // owner-provided alt text
}
```

### MoneyDTO v1.0

```typescript
interface MoneyDTO {
  readonly schemaVersion: '1.0';
  readonly amount: number;           // decimal major units (e.g. 249.00 INR)
  readonly currency: string;         // ISO 4217, e.g. "INR"
}
```

### BadgeDTO v1.0

```typescript
interface BadgeDTO {
  readonly schemaVersion: '1.0';
  readonly kind: BadgeKind;
  readonly displayText: string;      // owner or platform label — never renderer-invented
}

type BadgeKind =
  | 'pure_veg' | 'veg_friendly' | 'cloud_kitchen' | 'halal' | 'jain'
  | 'fssai_verified' | 'new' | 'custom';
```

### LabelDTO v1.0

```typescript
interface LabelDTO {
  readonly schemaVersion: '1.0';
  readonly kind: LabelKind;
  readonly displayText: string;      // owner-authored label text
}

type LabelKind =
  | 'BESTSELLER' | 'CHEF_PICK' | 'NEW' | 'LIMITED' | 'FESTIVAL'
  | 'HEALTHY' | 'KIDS' | 'POPULAR' | 'SPICY' | 'PROTEIN' | 'SEASONAL' | 'CUSTOM';
```

---

## Deliverable 1 — RestaurantDTO v1.0

Public restaurant contract for listing and detail contexts.

```typescript
interface RestaurantDTO {
  readonly schemaVersion: '1.0';

  // Identity
  readonly restaurantId: string;       // opaque public ID
  readonly slug: string;             // URL slug
  readonly displayName: string;
  readonly tagline?: string;
  readonly description?: string;

  // Brand
  readonly theme: ThemeDTO;

  // Business
  readonly cuisines: readonly string[];
  readonly priceBandLabel?: string;  // owner-set, e.g. "₹₹" or "Moderate"
  readonly priceForTwo?: MoneyDTO;
  readonly dietaryTags: readonly BadgeDTO[];

  // Gallery (summary — full list also in experience envelope)
  readonly galleryPreview: readonly GalleryDTO[];  // max 4 in listing context

  // Delivery (policy snapshot — query may refine via DeliveryQuoteDTO)
  readonly delivery: RestaurantDeliveryDTO;

  // Business hours (summary)
  readonly businessHours: BusinessHoursSummaryDTO;

  // Marketplace
  readonly marketplace: RestaurantMarketplaceDTO;

  // Discovery
  readonly discovery: RestaurantDiscoveryDTO;
}
```

### RestaurantDeliveryDTO v1.0

```typescript
interface RestaurantDeliveryDTO {
  readonly schemaVersion: '1.0';
  readonly deliveryEnabled: boolean;
  readonly pickupEnabled: boolean;
  readonly minimumOrderAmount?: MoneyDTO;
  readonly packagingFee?: MoneyDTO;
  readonly defaultPrepMinutes?: number;
  readonly fee?: MoneyDTO | null;    // null = free delivery at snapshot
  readonly etaMinutes?: EtaRangeDTO;
  readonly distanceKm?: number;      // present when geo query supplied
}

interface EtaRangeDTO {
  readonly schemaVersion: '1.0';
  readonly min: number;
  readonly max: number;
}
```

### BusinessHoursSummaryDTO v1.0

```typescript
interface BusinessHoursSummaryDTO {
  readonly schemaVersion: '1.0';
  readonly operationalStatus: OperationalStatus;
  readonly todayHoursLabel?: string; // owner/projection-authored, e.g. "11:00 AM – 11:00 PM"
  readonly consumerMessage?: string; // vacation / closure message
}

type OperationalStatus =
  | 'open' | 'closing_soon' | 'closed' | 'paused' | 'vacation' | 'emergency_closed';
```

### RestaurantMarketplaceDTO v1.0

```typescript
interface RestaurantMarketplaceDTO {
  readonly schemaVersion: '1.0';
  readonly visibility: 'hidden' | 'listed' | 'featured' | 'promoted';
  readonly rating?: number;            // aggregate — not owner-editable
  readonly ratingCount?: number;
  readonly offers: readonly OfferDTO[];           // enabled offers only
  readonly primaryOffer?: OfferDTO;             // highest priority enabled
  readonly highlights: readonly HighlightDTO[];
  readonly policies: readonly PolicyDTO[];
}

interface HighlightDTO {
  readonly schemaVersion: '1.0';
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
}

interface PolicyDTO {
  readonly schemaVersion: '1.0';
  readonly id: string;
  readonly title: string;
  readonly body: string;
}
```

### RestaurantDiscoveryDTO v1.0

```typescript
interface RestaurantDiscoveryDTO {
  readonly schemaVersion: '1.0';
  readonly searchKeywords: readonly string[];
  readonly listingBadges: readonly BadgeDTO[];
  readonly featuredPriority?: number;  // platform weight — optional
}
```

### RestaurantExperienceDTO v1.0 (envelope)

```typescript
interface RestaurantExperienceDTO {
  readonly schemaVersion: '1.0';
  readonly restaurant: RestaurantDTO;
  readonly weeklyHours: readonly DayHoursDTO[];
  readonly serviceability: ServiceabilityDTO;
}

interface DayHoursDTO {
  readonly schemaVersion: '1.0';
  readonly day: DayOfWeek;
  readonly open: string;               // HH:mm 24h or locale string from owner config
  readonly close: string;
  readonly closed: boolean;
  readonly isToday: boolean;
}

type DayOfWeek =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday'
  | 'friday' | 'saturday' | 'sunday';

interface ServiceabilityDTO {
  readonly schemaVersion: '1.0';
  readonly delivery: boolean;
  readonly pickup: boolean;
  readonly message?: string;
}
```

---

## Deliverable 2 — FoodDTO v1.0

```typescript
interface FoodDTO {
  readonly schemaVersion: '1.0';

  // Identity
  readonly foodId: string;           // opaque public ID
  readonly slug: string;
  readonly restaurantId: string;     // opaque public restaurant ID
  readonly categoryId: string;       // opaque public category ID
  readonly name: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly displayOrder: number;

  // Media
  readonly media: FoodMediaDTO;

  // Pricing
  readonly pricing: FoodPricingDTO;

  // Availability
  readonly availability: FoodAvailabilityDTO;

  // Labels
  readonly labels: readonly LabelDTO[];

  // Offers (enabled only — absent if none)
  readonly offer?: OfferDTO;

  // Variants
  readonly variants: readonly VariantDTO[];

  // Addon Groups
  readonly addonGroups: readonly AddonGroupDTO[];

  // Story
  readonly story?: FoodStoryDTO;

  // Nutrition
  readonly nutrition?: FoodNutritionDTO;
  readonly allergens?: FoodAllergensDTO;

  // Metadata (consumer-safe subset only)
  readonly metadata: FoodMetadataDTO;
}
```

### FoodMediaDTO v1.0

```typescript
interface FoodMediaDTO {
  readonly schemaVersion: '1.0';
  readonly hero: ImageDTO;
  readonly gallery: readonly ImageDTO[];
}
```

### FoodPricingDTO v1.0

```typescript
interface FoodPricingDTO {
  readonly schemaVersion: '1.0';
  readonly regularPrice: MoneyDTO;
  readonly sellingPrice?: MoneyDTO;  // present when on active offer
  readonly mrp?: MoneyDTO;
  readonly taxIncluded: boolean;
}
```

### FoodAvailabilityDTO v1.0

```typescript
interface FoodAvailabilityDTO {
  readonly schemaVersion: '1.0';
  readonly status: FoodAvailabilityStatus;
  readonly consumerMessage?: string;
}

type FoodAvailabilityStatus =
  | 'available' | 'out_of_stock' | 'limited' | 'preorder'
  | 'today_only' | 'time_based' | 'hidden';
```

### FoodStoryDTO v1.0

```typescript
interface FoodStoryDTO {
  readonly schemaVersion: '1.0';
  readonly chefNote?: string;
  readonly ingredients: readonly string[];
  readonly cookingStyle?: string;
  readonly servingSize?: string;
  readonly popularPairingLabel?: string;
  readonly popularPairingFoodIds: readonly string[];
}
```

### FoodNutritionDTO v1.0

```typescript
interface FoodNutritionDTO {
  readonly schemaVersion: '1.0';
  readonly summary?: string;
  readonly caloriesKcal?: number;
}
```

### FoodAllergensDTO v1.0

```typescript
interface FoodAllergensDTO {
  readonly schemaVersion: '1.0';
  readonly summary?: string;
  readonly tags: readonly string[];
}
```

### FoodMetadataDTO v1.0

```typescript
interface FoodMetadataDTO {
  readonly schemaVersion: '1.0';
  readonly dietary: DietaryClassification;
  readonly spiceLevel?: SpiceLevel;
  readonly preparationMinutes?: number;
  readonly rating?: number;
}

type DietaryClassification = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain' | 'halal';

type SpiceLevel = 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot';
```

### FoodMenuDTO v1.0 (envelope)

```typescript
interface FoodMenuDTO {
  readonly schemaVersion: '1.0';
  readonly slug: string;
  readonly restaurantName: string;
  readonly theme: ThemeDTO;
  readonly categories: readonly CategoryDTO[];
  readonly items: readonly FoodDTO[];
  readonly featuredFoodIds: readonly string[];
  readonly todaysSpecialFoodIds: readonly string[];
}
```

---

## Deliverable 3 — CategoryDTO v1.0

```typescript
interface CategoryDTO {
  readonly schemaVersion: '1.0';
  readonly categoryId: string;       // opaque public ID
  readonly slug: string;
  readonly name: string;
  readonly image?: ImageDTO;
  readonly icon?: string;            // icon key or emoji — owner-set
  readonly displayOrder: number;
  readonly visibility: CategoryVisibility;
  readonly schedule?: CategoryScheduleDTO;
  readonly itemCount: number;
  readonly parentCategoryId?: string;
}

type CategoryVisibility = 'visible' | 'hidden' | 'scheduled';

interface CategoryScheduleDTO {
  readonly schemaVersion: '1.0';
  readonly daysOfWeek: readonly DayOfWeek[];
  readonly startTime: string;          // HH:mm
  readonly endTime: string;
  readonly festivalTag?: string;
}
```

---

## Deliverable 4 — OfferDTO v1.0

Never exposes implementation logic (no percentage math targets, no internal coupon codes).

```typescript
interface OfferDTO {
  readonly schemaVersion: '1.0';
  readonly offerId: string;          // opaque public ID
  readonly enabled: true;            // ONLY enabled offers appear in contracts
  readonly displayText: string;      // consumer copy — owner-authored
  readonly badge?: string;           // short pill text
  readonly description?: string;
  readonly priority: number;
  readonly validity: OfferValidityDTO;
  readonly type: OfferType;
}

interface OfferValidityDTO {
  readonly schemaVersion: '1.0';
  readonly startsAt?: string;          // ISO 8601
  readonly endsAt?: string;
  readonly recurring: boolean;
}

type OfferType =
  | 'percentage' | 'flat_amount' | 'bogo' | 'free_delivery'
  | 'free_item' | 'bundle' | 'festival' | 'custom';
```

**Mapper rule:** Disabled offers are **omitted** from DTO output — never `enabled: false`.

**Renderer rule:** Display `displayText` verbatim. Never compute alternate copy.

---

## Deliverable 5 — VariantDTO v1.0

```typescript
interface VariantDTO {
  readonly schemaVersion: '1.0';
  readonly variantId: string;
  readonly kind: VariantKind;
  readonly displayName: string;      // owner label: "Half", "Family", etc.
  readonly priceDelta: MoneyDTO;     // additive to base regularPrice; zero = same price
  readonly absolutePrice?: MoneyDTO;  // when set, overrides base + delta (mapper resolves)
  readonly availability: FoodAvailabilityDTO;
  readonly sortOrder: number;
  readonly isDefault: boolean;
}

type VariantKind =
  | 'small' | 'medium' | 'large' | 'half' | 'full' | 'mini' | 'family'
  | 'regular' | '500gm' | '1kg' | 'custom';
```

**Pricing resolution (mapper — not in contract):**  
Consumer line price = `absolutePrice ?? regularPrice + priceDelta` (+ addons).

---

## Deliverable 6 — AddonGroupDTO v1.0

```typescript
interface AddonGroupDTO {
  readonly schemaVersion: '1.0';
  readonly groupId: string;
  readonly displayName: string;
  readonly selectionRules: AddonSelectionRulesDTO;
  readonly sortOrder: number;
  readonly options: readonly AddonOptionDTO[];
}

interface AddonSelectionRulesDTO {
  readonly schemaVersion: '1.0';
  readonly required: boolean;
  readonly minSelections: number;
  readonly maxSelections: number;
  readonly allowMultiplePerOption: boolean;
}

interface AddonOptionDTO {
  readonly schemaVersion: '1.0';
  readonly optionId: string;
  readonly displayName: string;
  readonly kind: string;             // semantic key: extra_cheese, butter, etc.
  readonly pricing: AddonPricingDTO;
  readonly availability: FoodAvailabilityDTO;
  readonly maxQuantity?: number;
  readonly sortOrder: number;
}

interface AddonPricingDTO {
  readonly schemaVersion: '1.0';
  readonly price: MoneyDTO;          // additive; zero amount = free
}
```

---

## Deliverable 7 — ThemeDTO v1.0

```typescript
interface ThemeDTO {
  readonly schemaVersion: '1.0';
  readonly logo: ImageDTO;
  readonly cover?: ImageDTO;
  readonly colors: ThemeColorsDTO;
  readonly brandAssets: readonly BrandAssetDTO[];
}

interface ThemeColorsDTO {
  readonly schemaVersion: '1.0';
  readonly primary?: string;         // hex #RRGGBB
  readonly secondary?: string;
  readonly highlight?: string;
}

interface BrandAssetDTO {
  readonly schemaVersion: '1.0';
  readonly kind: 'logo' | 'cover' | 'icon_mark' | 'watermark' | 'custom';
  readonly image: ImageDTO;
}
```

---

## Deliverable 8 — GalleryDTO v1.0

```typescript
interface GalleryDTO {
  readonly schemaVersion: '1.0';
  readonly galleryItemId: string;
  readonly image: ImageDTO;
  readonly caption?: string;
  readonly sortOrder: number;
  readonly visibility: GalleryVisibility;
  readonly kind?: GalleryKind;
}

type GalleryVisibility = 'visible' | 'hidden';

type GalleryKind =
  | 'kitchen' | 'dining' | 'food' | 'packaging' | 'chef'
  | 'ambience' | 'team' | 'custom';
```

---

## API response envelopes

### MarketplaceSuccessDTO

```typescript
interface MarketplaceResponseDTO<T> {
  readonly schemaVersion: '1.0';
  readonly data: T;
  readonly meta?: ResponseMetaDTO;
}

interface ResponseMetaDTO {
  readonly schemaVersion: '1.0';
  readonly requestId: string;
  readonly cachedAt?: string;
  readonly dtoVersions: readonly string[];  // e.g. ["RestaurantDTO/1.0"]
}
```

---

## Contract ↔ Domain alignment

| Domain entity (PX6.1A) | Contract |
|---|---|
| `Restaurant` | `RestaurantDTO` |
| `FoodProduct` | `FoodDTO` |
| `Category` | `CategoryDTO` |
| `Offer` | `OfferDTO` |
| `ProductVariant` | `VariantDTO` |
| `AddonGroup` + `AddonOption` | `AddonGroupDTO` |
| `RestaurantBrand` | `ThemeDTO` |
| `GalleryItem` | `GalleryDTO` |

Domain may contain additional internal fields never exposed in contracts.

---

## Error contracts — MarketplaceErrorDTO v1.0

Standard error responses for all Marketplace API endpoints.

```typescript
interface MarketplaceErrorDTO {
  readonly schemaVersion: '1.0';
  readonly error: MarketplaceErrorBody;
}

interface MarketplaceErrorBody {
  readonly code: MarketplaceErrorCode;
  readonly message: string;              // consumer-safe, localized by API
  readonly requestId: string;
  readonly details?: readonly ErrorDetailDTO[];
  readonly retryable: boolean;
}

interface ErrorDetailDTO {
  readonly schemaVersion: '1.0';
  readonly field?: string;               // JSON pointer, e.g. "/pricing/regularPrice"
  readonly code: string;
  readonly message: string;
}

type MarketplaceErrorCode =
  | 'VALIDATION_FAILED'
  | 'REQUIRED_FIELD_MISSING'
  | 'INVALID_REFERENCE'
  | 'DUPLICATE_SLUG'
  | 'OFFER_TEXT_REQUIRED'
  | 'RESTAURANT_NOT_FOUND'
  | 'RESTAURANT_UNAVAILABLE'
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_UNAVAILABLE'
  | 'OFFER_NOT_FOUND'
  | 'OFFER_UNAVAILABLE'
  | 'MENU_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'NOT_SERVICEABLE'
  | 'CONTRACT_VERSION_UNSUPPORTED'
  | 'INTERNAL_ERROR';
```

### Error scenario mapping

| Scenario | HTTP | code | retryable |
|---|---|---|---|
| Validation failed (owner write) | 400 | `VALIDATION_FAILED` | false |
| Required field missing at publish | 400 | `REQUIRED_FIELD_MISSING` | false |
| Invalid categoryId / foodId reference | 400 | `INVALID_REFERENCE` | false |
| Duplicate slug | 409 | `DUPLICATE_SLUG` | false |
| Enabled offer without displayText | 400 | `OFFER_TEXT_REQUIRED` | false |
| Restaurant slug not found | 404 | `RESTAURANT_NOT_FOUND` | false |
| Restaurant paused / suspended / hidden | 404 | `RESTAURANT_UNAVAILABLE` | true |
| Food ID not found | 404 | `PRODUCT_NOT_FOUND` | false |
| Food out_of_stock / hidden | 404 | `PRODUCT_UNAVAILABLE` | true |
| Offer ID not found | 404 | `OFFER_NOT_FOUND` | false |
| Offer disabled or expired | 404 | `OFFER_UNAVAILABLE` | true |
| Menu not published | 404 | `MENU_NOT_FOUND` | false |
| Category not found | 404 | `CATEGORY_NOT_FOUND` | false |
| Outside delivery zone | 422 | `NOT_SERVICEABLE` | false |
| Unsupported Accept version | 406 | `CONTRACT_VERSION_UNSUPPORTED` | false |
| Unexpected server fault | 500 | `INTERNAL_ERROR` | true |

**Renderer behavior:**

| code | OrderBhojan UI |
|---|---|
| `RESTAURANT_NOT_FOUND` | PremiumEmpty — restaurant not found |
| `RESTAURANT_UNAVAILABLE` | PremiumEmpty — temporarily unavailable + message |
| `MENU_NOT_FOUND` | Menu unavailable empty state |
| `PRODUCT_UNAVAILABLE` | Disable add / sold out |
| `NOT_SERVICEABLE` | Location / delivery message |
| `INTERNAL_ERROR` | ErrorState with retry |

Errors never contain Firestore paths, stack traces, or internal IDs in `message`.

---

*End of DTO Specification v1.0*

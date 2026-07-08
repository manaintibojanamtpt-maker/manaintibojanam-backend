# 06 — Marketplace Projection

Public DTOs for OrderBhojan. **Design only — no implementation.**

```
Firestore → Domain Entity → Mapper → Public DTO → OrderBhojan Renderer
```

All DTO fields are **readonly**. No internal BhojanOS IDs except opaque public IDs.

---

## DTO catalog

| DTO | Purpose |
|---|---|
| `RestaurantDTO` | Discovery cards, list tiles |
| `RestaurantExperienceDTO` | Restaurant page envelope |
| `CategoryDTO` | Menu category rail |
| `FoodDTO` | Menu product row / poster |
| `OfferDTO` | Offer pill / badge |
| `VariantDTO` | Customize sheet size options |
| `AddonGroupDTO` | Customize sheet addon sections |
| `AddonOptionDTO` | Individual addon choice |
| `ThemeDTO` | Brand tokens for page chrome |
| `GalleryDTO` | Gallery rail items |
| `BusinessStatusDTO` | Open/closed + today's hours |
| `DeliveryQuoteDTO` | Fee + ETA for user location |
| `FoodMenuDTO` | Full menu page envelope |

---

## RestaurantDTO

Listing / discovery card.

```typescript
interface RestaurantDTO {
  readonly restaurantId: string;       // opaque public ID
  readonly slug: string;
  readonly displayName: string;
  readonly tagline?: string;
  readonly logo: ImageDTO;
  readonly cover: ImageDTO;
  readonly rating?: number;
  readonly ratingCount?: number;
  readonly cuisines: readonly string[];
  readonly priceBandLabel?: string;    // owner or derived — never threshold math in renderer
  readonly distanceKm?: number;        // computed at query
  readonly eta?: { readonly min: number; readonly max: number };
  readonly deliveryFee?: number | null; // null = free
  readonly badges: readonly BadgeDTO[];
  readonly operationalStatus: OperationalStatusDTO;
  readonly primaryOffer?: OfferDTO;    // highest priority enabled restaurant offer
  readonly theme?: ThemeDTO;
}
```

---

## RestaurantExperienceDTO

Full restaurant page (extends listing fields).

```typescript
interface RestaurantExperienceDTO {
  readonly restaurant: RestaurantDTO;
  readonly description?: string;
  readonly gallery: readonly GalleryDTO[];
  readonly highlights: readonly HighlightDTO[];
  readonly offers: readonly OfferDTO[];     // all enabled restaurant-scoped
  readonly hours: readonly DayHoursDTO[];
  readonly todayHoursLabel?: string;
  readonly serviceability: ServiceabilityDTO;
  readonly policies: readonly PolicyDTO[];
}

interface ServiceabilityDTO {
  readonly delivery: boolean;
  readonly pickup: boolean;
  readonly message?: string;
  readonly minimumOrderAmount?: number;
}

interface HighlightDTO {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
}

interface PolicyDTO {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

interface DayHoursDTO {
  readonly day: string;
  readonly open: string;
  readonly close: string;
  readonly isToday?: boolean;
}
```

---

## CategoryDTO

```typescript
interface CategoryDTO {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly image?: ImageDTO;
  readonly icon?: string;
  readonly itemCount: number;
  readonly parentId?: string;
}
```

---

## FoodDTO

```typescript
interface FoodDTO {
  readonly foodId: string;               // opaque public ID
  readonly slug: string;
  readonly name: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly hero: ImageDTO;
  readonly gallery?: readonly ImageDTO[];
  readonly pricing: PricingDTO;
  readonly offer?: OfferDTO;           // ONLY if enabled
  readonly labels: readonly LabelDTO[];
  readonly dietary: DietaryDTO;
  readonly availability: AvailabilityDTO;
  readonly preparation?: PreparationDTO;
  readonly story?: StoryDTO;
  readonly nutrition?: NutritionDTO;
  readonly allergens?: AllergensDTO;
  readonly rating?: number;
  readonly variants: readonly VariantDTO[];
  readonly addonGroups: readonly AddonGroupDTO[];
  readonly popularPairing?: PairingDTO;
}

interface PricingDTO {
  readonly regularPrice: number;
  readonly sellingPrice?: number;      // present only when on offer
  readonly mrp?: number;
  readonly currency: string;
  readonly taxIncluded: boolean;
  readonly displayMode: 'simple' | 'show_mrp' | 'show_savings';
}

interface LabelDTO {
  readonly kind: string;               // BESTSELLER, CHEF_PICK, CUSTOM, ...
  readonly text: string;               // owner display text
}

interface DietaryDTO {
  readonly classification: 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain' | 'halal';
  readonly labels?: readonly string[];
}

interface AvailabilityDTO {
  readonly status: 'available' | 'out_of_stock' | 'limited' | 'preorder' | 'today_only' | 'time_based';
  readonly message?: string;
}

interface PreparationDTO {
  readonly estimatedMinutes?: number;
  readonly servingSize?: string;
  readonly spiceLevel?: 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot';
  readonly cookingMethod?: string;
}

interface StoryDTO {
  readonly chefNote?: string;
  readonly ingredients?: readonly string[];
  readonly originStory?: string;
}

interface NutritionDTO {
  readonly summary?: string;
  readonly caloriesKcal?: number;
}

interface AllergensDTO {
  readonly summary?: string;
  readonly tags?: readonly string[];
}

interface PairingDTO {
  readonly label: string;
  readonly productIds: readonly string[];
}
```

---

## OfferDTO

```typescript
interface OfferDTO {
  readonly id: string;
  readonly enabled: true;              // disabled offers NEVER appear in DTO
  readonly text: string;               // consumer copy — owner-authored
  readonly badge?: string;
  readonly description?: string;
  readonly type: string;               // informational only for renderer icons (future)
}
```

**Mapper rule:** If `domain.offer.enabled === false` → **omit** from DTO entirely.

**Renderer rule:** Never compute `percentage OFF`. Display `offer.text` verbatim.

---

## VariantDTO

```typescript
interface VariantDTO {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly pricing: PricingDTO;
  readonly availability: AvailabilityDTO;
  readonly isDefault: boolean;
}
```

---

## AddonGroupDTO / AddonOptionDTO

```typescript
interface AddonGroupDTO {
  readonly id: string;
  readonly name: string;
  readonly required: boolean;
  readonly minSelections: number;
  readonly maxSelections: number;
  readonly options: readonly AddonOptionDTO[];
}

interface AddonOptionDTO {
  readonly id: string;
  readonly label: string;
  readonly price: number;
  readonly availability: AvailabilityDTO;
  readonly maxQuantity?: number;
}
```

---

## ThemeDTO

```typescript
interface ThemeDTO {
  readonly logo: ImageDTO;
  readonly cover?: ImageDTO;
  readonly primaryColor?: string;
  readonly secondaryColor?: string;
  readonly highlightColor?: string;
}
```

---

## GalleryDTO

```typescript
interface GalleryDTO {
  readonly id: string;
  readonly image: ImageDTO;
  readonly caption?: string;
  readonly kind?: string;
}
```

---

## ImageDTO

```typescript
interface ImageDTO {
  readonly url: string;
  readonly width?: number;
  readonly height?: number;
  readonly blurHash?: string;
  readonly alt?: string;
}
```

Renderer builds srcset/AVIF from `url` + platform pipeline — URLs originate from owner media only.

---

## FoodMenuDTO

```typescript
interface FoodMenuDTO {
  readonly slug: string;
  readonly restaurantName: string;
  readonly theme?: ThemeDTO;
  readonly categories: readonly CategoryDTO[];
  readonly items: readonly FoodDTO[];
  readonly featuredIds: readonly string[];
  readonly todaysSpecialIds: readonly string[];
}
```

---

## BadgeDTO

```typescript
interface BadgeDTO {
  readonly kind: string;
  readonly label: string;
}
```

---

## OperationalStatusDTO

```typescript
type OperationalStatusDTO =
  | 'open'
  | 'closing_soon'
  | 'closed'
  | 'paused'
  | 'vacation'
  | 'emergency_closed';
```

Renderer maps to localized label via BDS i18n — **status value** comes from DTO, not local clock logic.

---

## DeliveryQuoteDTO (query-time)

```typescript
interface DeliveryQuoteDTO {
  readonly deliveryFee: number | null;
  readonly eta: { readonly min: number; readonly max: number };
  readonly distanceKm: number;
  readonly serviceable: boolean;
  readonly message?: string;
}
```

Computed by marketplace API from `DeliveryPolicy` + user coordinates. Never stored in OrderBhojan.

---

## Mapper responsibilities (PX6.1D)

| Transform | Where |
|---|---|
| Domain → DTO field subset | Mapper |
| Resolve addon group refs | Mapper |
| Resolve active offers by scope + schedule | Offer engine → Mapper |
| Compute ETA/fee | Delivery engine → DeliveryQuoteDTO |
| Compute operational status | Schedule engine → OperationalStatusDTO |
| Generate blurHash URLs | Media service → ImageDTO |
| Strip disabled offers | Mapper |
| Strip hidden products/categories | Mapper |

---

## Mapping from current OrderBhojan types

| Current type | Target DTO | Breaking changes |
|---|---|---|
| `FoodPublic` | `FoodDTO` | `bestSeller` bool → `labels[]`; add `offer: OfferDTO` |
| `FoodCategoryPublic` | `CategoryDTO` | Add `image`, `icon` |
| `RestaurantPublic` | `RestaurantDTO` | Add `operationalStatus`, `primaryOffer` |
| `RestaurantExperiencePublic` | `RestaurantExperienceDTO` | Split envelope |
| `FoodVariant` | `VariantDTO` | Add `availability` |
| `FoodAddon` | `AddonOptionDTO` | Wrap in `AddonGroupDTO` |

Compat shims in PX6.1D emit both shapes during transition (see Migration Strategy).

---

## Renderer contract (OrderBhojan)

```typescript
// Pseudocode — OrderBhojan ONLY
function renderOffer(offer?: OfferDTO) {
  if (!offer?.enabled) return null;
  return <Badge>{offer.text}</Badge>;
}

function renderLabels(labels: readonly LabelDTO[]) {
  return labels.map(l => <Badge key={l.kind}>{l.text}</Badge>);
}
```

OrderBhojan **never** imports domain entities or Firestore documents.

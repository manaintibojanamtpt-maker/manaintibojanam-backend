# 08 — Migration Notes

Mapping from **current OrderBhojan implementation** and **legacy BhojanOS** to **v1.0 contracts**.

Reference: [PX6.1 Audit](../px61/02-HARDCODED-VALUE-INVENTORY.md).

---

## Type migration map

### FoodPublic → FoodDTO v1.0

| Legacy (`marketplace-food.ts`) | Contract v1.0 | Migration action |
|---|---|---|
| `foodId` | `foodId` | Keep opaque ID format |
| `slug` | `slug` | Direct |
| `name` | `name` | Direct |
| `description` | `description` | Direct |
| `image` | `media.hero.url` | Wrap in ImageDTO |
| `price` | `pricing.regularPrice` | Wrap in MoneyDTO |
| `offerPrice` | `pricing.sellingPrice` | + require `offer.displayText` from owner |
| `currency` | `pricing.regularPrice.currency` | Direct |
| `category` | — | Resolve to `categoryId` |
| `categoryId` | `categoryId` | Direct |
| `rating` | `metadata.rating` | Direct |
| `dietary` | `metadata.dietary` | Enum map: nonVeg → non_veg |
| `preparationTime` | `metadata.preparationMinutes` | Direct |
| `availability` | `availability.status` | Map bool → enum |
| `bestSeller` | `labels[]` | **Replace** — `{ kind: BESTSELLER, displayText }` |
| `chefSpecial` | `labels[]` | **Replace** — `{ kind: CHEF_PICK, displayText }` |
| `recommended` | `labels[]` | `{ kind: POPULAR, displayText }` or remove |
| `newItem` | `labels[]` | `{ kind: NEW, displayText }` |
| `variants[]` | `variants[]` | Add priceDelta from base price |
| `addons[]` | `addonGroups[]` | Wrap in default group or link AddonGroup |
| `chefNote`, `ingredients`, etc. | `story.*` | Direct |
| `spiceLevel` | `metadata.spiceLevel` | Enum map mild/medium/hot/extraHot |
| — | `schemaVersion: "1.0"` | Mapper adds |

### RestaurantPublic → RestaurantDTO v1.0

| Legacy | Contract v1.0 | Migration |
|---|---|---|
| `restaurantId` | `restaurantId` | Direct |
| `restaurantSlug` | `slug` | Rename |
| `displayName` | `displayName` | Direct |
| `logoUrl` | `theme.logo.url` | ImageDTO |
| `coverUrl` | `theme.cover.url` | ImageDTO |
| `rating` | `marketplace.rating` | Direct |
| `ratingCount` | `marketplace.ratingCount` | Direct |
| `cuisines` | `cuisines` | Direct |
| `priceForTwo` | `priceForTwo` | MoneyDTO wrap |
| `distanceKm` | `delivery.distanceKm` | Move |
| `etaMinutes` | `delivery.etaMinutes` | Move |
| `deliveryFee` | `delivery.fee` | MoneyDTO wrap |
| `isOpen` | `businessHours.operationalStatus` | Map to enum |
| `badges[]` | `discovery.listingBadges[]` | BadgeDTO wrap |

### RestaurantExperiencePublic → RestaurantExperienceDTO v1.0

| Legacy | Contract v1.0 | Migration |
|---|---|---|
| `offers[]` | `marketplace.offers[]` | Map title → displayText |
| `gallery[]` | `galleryPreview` + full in experience | GalleryDTO |
| `description` | `description` | Direct |
| `highlights` | `marketplace.highlights` | Direct |
| `hours` (in response) | `weeklyHours` | DayHoursDTO |
| `todayHours` | `businessHours.todayHoursLabel` | Direct |
| `policies` | `marketplace.policies` | Direct |

---

## Mock → contract elimination

| Mock source | Contract source | PX phase |
|---|---|---|
| `foodExperienceMockLogic.ts` | Firestore products | 6.1D + 6.1F |
| `restaurantExperienceMockLogic.ts` | Firestore restaurant | 6.1D + 6.1F |
| `fixtures.ts` MOCK_RESTAURANTS | Firestore restaurants | 6.1D + 6.1F |
| `mockCatalog.ts` | Discovery API | 6.1E + 6.1F |
| `COMMON_ADDONS` | Per-product AddonGroupDTO | 6.1C + 6.1D |
| `food-item-photo-manifest.ts` | `ImageDTO.url` from owner | 6.1C + 6.1E |
| `restaurant-photo-manifest.ts` | `GalleryDTO` + ThemeDTO | 6.1C + 6.1E |
| `formatOfferLabel()` | `offer.displayText` | 6.1E |

---

## BhojanOS Firestore legacy → domain → contract

| Legacy Firestore | Domain entity | Contract |
|---|---|---|
| `tenants/{slug}` | `Restaurant` | `RestaurantDTO` |
| `menu/{itemId}` | `FoodProduct` | `FoodDTO` |
| `categories/{id}` (admin) | `Category` | `CategoryDTO` |
| `coupons/{id}` | — (checkout only) | **Not** OfferDTO |
| `tenants.branding.logoUrl` | `RestaurantBrand` | `ThemeDTO.logo` |
| `tenants.deliveryConfig` | `DeliveryPolicy` | `RestaurantDeliveryDTO` |
| `tenants.storeOperations` | `BusinessSchedule` partial | `BusinessHoursSummaryDTO` |
| `MenuItem.addons[]` (type only) | `AddonGroup` | `AddonGroupDTO` |
| `MenuItem.isBestSeller` | `labels[]` | `LabelDTO` |

---

## Offer migration (critical)

| Current | v1 contract |
|---|---|
| UI computes `17% OFF` | Owner sets `displayText: "17% OFF"` OR any copy |
| `RestaurantOffer.title` | `OfferDTO.displayText` |
| `RestaurantOffer.badge` | `OfferDTO.badge` |
| Mock `OFFERS_BY_SLUG` | Owner Offer aggregate in Firestore |

**Migration script responsibility (6.1B):** Do NOT auto-generate displayText from percentage unless owner approves batch review queue.

---

## Variant price migration

| Current mock | v1 contract |
|---|---|
| Variant absolute prices in mock | `absolutePrice` OR `priceDelta` from base |
| Base product price | `pricing.regularPrice` |

Mapper rule: Prefer `absolutePrice` when legacy data has full variant prices; compute `priceDelta = variantPrice - basePrice` for v1 emit if needed.

---

## MSW transitional strategy (6.1D prep)

Phase A — MSW emits v1 contract shape (no Firestore):

```
MSW handler → v1 Contract JSON → OrderBhojan client types updated
```

Phase B — Firestore mapper replaces MSW per flag:

```
FF_OB_FIRESTORE_MENU=true → Firestore mapper → same v1 JSON shape
```

Phase C — Remove MSW from default dev (6.1F).

OrderBhojan renderer code **unchanged** between Phase A and B if contracts stable.

---

## OrderBhojan formatter removals (6.1E)

| Remove | Replace with |
|---|---|
| `formatOfferLabel()` | `offer.displayText` |
| Boolean → "Bestseller" | `labels[].displayText` |
| `formatPriceRange()` thresholds | `priceBandLabel` from DTO |
| `resolveFoodItemPhoto(manifest)` | `media.hero` ImageDTO |

| Keep (formatting only) | Input |
|---|---|
| Currency format | `MoneyDTO` |
| ETA format | `EtaRangeDTO` |
| Distance format | number km |
| Operational status i18n | enum |

---

## Golden fixtures (PX6.1D deliverable)

Create static JSON fixtures conforming to v1.0:

```
contracts/fixtures/v1/
  restaurant-mana-inti.json
  food-menu-demo-biryani.json
  food-item-biryani.json
  offer-restaurant-50off.json
```

Used by: mapper tests, OrderBhojan storybook, contract validation CI.

---

## Rollback

If v1 contract rollout fails:

1. `FF_OB_FIRESTORE_*` → false
2. MSW v1 fixtures still valid OR revert to legacy types temporarily
3. Domain/Firestore data preserved — no rollback of owner edits

---

## Approval checklist before 6.1B

- [ ] All v1 DTO shapes approved (this spec)
- [ ] Offer displayText rule accepted by product
- [ ] LabelDTO replaces booleans — owner UI commitment (6.1C)
- [ ] MoneyDTO decimal convention confirmed
- [ ] Public ID format confirmed
- [ ] Error contract codes approved
- [ ] Event payloads approved for projection design

---

*Migration converts invented mock data into owner-configured domain truth — not a rename exercise.*

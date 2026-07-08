# 01 — Product Domain

**BhojanOS Product Domain Foundation**  
A dish is a **Product**, not a menu row. A restaurant is a **Commerce Aggregate**, not a tenant record.

---

## Domain vocabulary

| Term | Definition |
|---|---|
| **Restaurant** | A commerce entity that sells food products to consumers via marketplace channels |
| **Branch** | A physical or virtual fulfillment location under a restaurant (single kitchen, cloud kitchen, chain outlet) |
| **Food Product** | A sellable dish with full commerce semantics (pricing, availability, media, story) |
| **Category** | Owner-defined merchandising group; may be hierarchical |
| **Offer** | A time-bounded commercial incentive scoped to restaurant, category, or product |
| **Variant** | A size/portion option of a food product with its own price and availability |
| **Addon Group** | A configurable selection of extras with rules (min/max, required) |
| **Marketplace Projection** | Read-only public view of domain state for OrderBhojan |
| **Brand Theme** | Visual identity tokens consumed by marketplace cards and restaurant pages |

---

## Deliverable 1 — Restaurant Domain

### Aggregate root: `Restaurant`

The Restaurant aggregate owns identity, brand, operations, delivery policy, business schedule, marketplace presence, and compliance posture. It references but does not embed Food Products (separate aggregate).

---

### 1.1 Identity

| Field | Type | Required | Description |
|---|---|---|---|
| `restaurantId` | `RestaurantId` | ✓ | Stable internal identifier (never exposed to consumer) |
| `publicId` | `PublicRestaurantId` | ✓ | Opaque marketplace identifier |
| `slug` | `Slug` | ✓ | URL-safe unique handle |
| `legalName` | `string` | ✓ | Registered business name |
| `displayName` | `string` | ✓ | Consumer-facing name |
| `tagline` | `string` | | Short subtitle under name |
| `description` | `RichText` | | Long-form about copy |
| `businessType` | `BusinessType` | ✓ | See enum below |
| `lifecycleStatus` | `RestaurantLifecycleStatus` | ✓ | draft → active → suspended |
| `marketplaceStatus` | `MarketplaceVisibility` | ✓ | hidden / listed / featured |
| `createdAt` | `Timestamp` | ✓ | |
| `publishedAt` | `Timestamp` | | When first visible on marketplace |

**`BusinessType`:** `single_kitchen` | `cloud_kitchen` | `restaurant` | `chain_hq` | `franchise_unit`

**`RestaurantLifecycleStatus`:** `draft` | `onboarding` | `active` | `paused` | `suspended` | `archived`

**`MarketplaceVisibility`:** `hidden` | `listed` | `featured` | `promoted`

---

### 1.2 Brand

Owned value object: `RestaurantBrand`

| Field | Type | Description |
|---|---|---|
| `logo` | `MediaAsset` | Primary logo |
| `coverImage` | `MediaAsset` | Hero / card cover |
| `iconMark` | `MediaAsset` | Small favicon-style mark |
| `primaryColor` | `ColorToken` | Accent for marketplace |
| `secondaryColor` | `ColorToken` | Supporting accent |
| `highlightColor` | `ColorToken` | Offer/badge emphasis |
| `typographyPreference` | `TypographyPreference` | Future: font pairing hint |
| `voiceTone` | `BrandVoice` | Future: AI copy generation hint |

---

### 1.3 Operations

| Field | Type | Description |
|---|---|---|
| `branches` | `BranchId[]` | One or more fulfillment locations |
| `defaultBranchId` | `BranchId` | Primary branch for single-kitchen |
| `fulfillmentModes` | `FulfillmentMode[]` | delivery, pickup, dine_in (future) |
| `operationalStatus` | `OperationalStatus` | Real-time store state |
| `offlineMessage` | `string` | Shown when manually closed |
| `acceptingOrders` | `boolean` | Master order acceptance switch |
| `maxConcurrentOrders` | `number` | Throttle (future) |
| `averagePrepMinutes` | `number` | Default prep baseline for ETA |

**`OperationalStatus`:** `open` | `closing_soon` | `closed` | `paused` | `vacation` | `emergency_closed`

**`FulfillmentMode`:** `delivery` | `pickup` | `dine_in` | `scheduled`

---

### 1.4 Delivery (policy reference)

Restaurant owns **delivery policy**. Execution details live in Delivery Domain (Deliverable 8). Restaurant holds `deliveryPolicyId`.

| Field | Type | Description |
|---|---|---|
| `deliveryPolicyId` | `DeliveryPolicyId` | Link to Delivery aggregate |
| `pickupEnabled` | `boolean` | |
| `pickupInstructions` | `string` | Consumer-facing pickup copy |
| `minimumOrderAmount` | `Money` | Minimum for delivery |
| `packagingFee` | `Money` | Flat packaging charge |
| `packagingDescription` | `string` | Consumer policy text |

---

### 1.5 Business (commercial)

| Field | Type | Description |
|---|---|---|
| `cuisines` | `CuisineTag[]` | Owner-selected cuisine taxonomy |
| `priceBand` | `PriceBand` | Owner-set or computed ₹–₹₹₹₹ |
| `priceBandLabel` | `string` | Optional explicit label override |
| `priceForTwoEstimate` | `Money` | Optional guide price |
| `currency` | `CurrencyCode` | Default INR |
| `taxProfileId` | `TaxProfileId` | GST configuration reference |
| `paymentMethodsAccepted` | `PaymentMethod[]` | COD, UPI, etc. (checkout scope) |

**`PriceBand`:** `budget` | `moderate` | `premium` | `luxury` | `custom`

---

### 1.6 Discovery

| Field | Type | Description |
|---|---|---|
| `discoveryTags` | `DiscoveryTag[]` | Platform + owner tags for search rails |
| `searchKeywords` | `string[]` | Owner SEO keywords |
| `featuredPriority` | `number` | Platform merchandising weight |
| `geoAnchor` | `GeoPoint` | Primary map pin (from default branch) |
| `serviceRadiusKm` | `number` | Max delivery reach |
| `listingBadges` | `RestaurantBadge[]` | Owner + system badges |

**`RestaurantBadge`:** `pure_veg` | `veg_friendly` | `cloud_kitchen` | `halal` | `jain` | `fssai_verified` | `new` | `custom`

---

### 1.7 Marketing

| Field | Type | Description |
|---|---|---|
| `highlights` | `MarketingHighlight[]` | Owner-authored trust/selling points |
| `promotionalBanners` | `PromotionalBanner[]` | Hero-level campaigns |
| `featuredProductIds` | `FoodProductId[]` | Signature dish curation |
| `todaysSpecialProductIds` | `FoodProductId[]` | Day-specific curation |
| `socialLinks` | `SocialLink[]` | Future |

**`MarketingHighlight`:** `{ id, title, subtitle?, icon?, sortOrder }`

---

### 1.8 Gallery

| Field | Type | Description |
|---|---|---|
| `gallery` | `GalleryItem[]` | Ordered media collection |

**`GalleryItem`:** `{ id, media: MediaAsset, caption?, kind: GalleryKind, sortOrder, visibility }`

**`GalleryKind`:** `kitchen` | `dining` | `food` | `packaging` | `chef` | `ambience` | `team` | `custom`

---

### 1.9 Compliance

| Field | Type | Description |
|---|---|---|
| `fssaiLicense` | `ComplianceDocument` | FSSAI number, expiry, certificate |
| `kycStatus` | `VerificationStatus` | Owner verification level |
| `allergenPolicyDefault` | `string` | Restaurant-wide allergen disclaimer |
| `legalDisclosures` | `LegalDisclosure[]` | Terms visible on marketplace |

Compliance is **system-owned** with owner-provided documents. Consumer sees verification badges derived from compliance state, not fabricated.

---

### 1.10 Marketplace

| Field | Type | Description |
|---|---|---|
| `marketplaceProfile` | `MarketplaceProfile` | Projection configuration |
| `consumerRatingSummary` | `RatingSummary` | Aggregated reviews (read-only to owner) |
| `offerIds` | `OfferId[]` | Active restaurant-scoped offers |
| `categoryDisplayOrder` | `CategoryId[]` | Menu category rail order |

**`RatingSummary`:** `{ averageRating?, ratingCount?, lastUpdated }` — sourced from reviews domain, not owner-editable.

---

### 1.11 Analytics (metadata)

| Field | Type | Description |
|---|---|---|
| `analyticsMetadata` | `RestaurantAnalyticsMetadata` | Opaque tags for BI |

Read-only to owner dashboard display; written by analytics pipeline. Never rendered on OrderBhojan consumer UI except aggregated counts owner explicitly opts to show in highlights.

---

### 1.12 Relationships

```
Restaurant 1 ── * Branch
Restaurant 1 ── * Category (root categories)
Restaurant 1 ── * FoodProduct
Restaurant 1 ── * Offer (restaurant scope)
Restaurant 1 ── 1 DeliveryPolicy
Restaurant 1 ── 1 BusinessSchedule
Restaurant 1 ── 1 RestaurantBrand
Restaurant * ── * CuisineTag (taxonomy reference)
```

---

## Deliverable 2 — Food Product Domain

### Aggregate root: `FoodProduct`

A **Product** is the unit of commerce. It is not a spreadsheet row.

---

### 2.1 Identity

| Field | Type | Required |
|---|---|---|
| `foodProductId` | `FoodProductId` | ✓ |
| `publicId` | `PublicFoodId` | ✓ |
| `restaurantId` | `RestaurantId` | ✓ |
| `categoryId` | `CategoryId` | ✓ |
| `slug` | `Slug` | ✓ |
| `name` | `string` | ✓ |
| `subtitle` | `string` | |
| `description` | `RichText` | |
| `displayOrder` | `number` | ✓ |
| `visibility` | `ProductVisibility` | ✓ |
| `lifecycleStatus` | `ProductLifecycleStatus` | ✓ |

**`ProductVisibility`:** `visible` | `hidden` | `scheduled` | `members_only` (future)

**`ProductLifecycleStatus`:** `draft` | `active` | `archived` | `discontinued`

---

### 2.2 Media

| Field | Type | Description |
|---|---|---|
| `media` | `ProductMedia` | Hero + gallery |

**`ProductMedia`:** `{ hero: MediaAsset, gallery: MediaAsset[], videoUrl?, blurHash? }`

All consumer images originate here. No external URLs in renderer.

---

### 2.3 Pricing

Value object: `ProductPricing`

| Field | Type | Description |
|---|---|---|
| `regularPrice` | `Money` | List price (MRP or standard) |
| `sellingPrice` | `Money?` | Active sell price if on offer |
| `mrp` | `Money?` | Struck-through reference |
| `currency` | `CurrencyCode` | |
| `taxIncluded` | `boolean` | |
| `taxRate` | `number?` | Reference to tax profile |
| `priceDisplayMode` | `PriceDisplayMode` | show_mrp / show_savings / simple |

Base price applies when no variant selected. Variant pricing overrides.

---

### 2.4 Availability

Value object: `ProductAvailability`

| Field | Type | Description |
|---|---|---|
| `status` | `AvailabilityStatus` | Primary consumer signal |
| `schedule` | `AvailabilitySchedule?` | Time-based windows |
| `branchAvailability` | `Map<BranchId, AvailabilityStatus>?` | Per-branch (chain) |
| `soldOutUntil` | `Timestamp?` | Auto-return time |
| `preorderConfig` | `PreorderConfig?` | Lead time for preorder |

**`AvailabilityStatus`:** `available` | `out_of_stock` | `limited` | `preorder` | `today_only` | `time_based` | `hidden`

---

### 2.5 Inventory (optional module)

| Field | Type | Description |
|---|---|---|
| `inventoryTrackingEnabled` | `boolean` | |
| `stockCount` | `number?` | Current units |
| `lowStockThreshold` | `number?` | |
| `autoHideWhenZero` | `boolean` | Maps to out_of_stock |

Inventory changes availability; owner configures rules, system enforces.

---

### 2.6 Variants

| Field | Type | Description |
|---|---|---|
| `hasVariants` | `boolean` | |
| `variantMode` | `VariantMode` | single_required / optional |
| `variants` | `ProductVariant[]` | See Deliverable 5 |

If `hasVariants`, consumer must select one before add.

---

### 2.7 Addons

| Field | Type | Description |
|---|---|---|
| `addonGroups` | `AddonGroupId[]` | References to Addon Group entities |

Addons are not global defaults — each product links its own groups.

---

### 2.8 Preparation

Value object: `ProductPreparation`

| Field | Type | Description |
|---|---|---|
| `estimatedMinutes` | `number?` | Consumer prep time badge |
| `servingSize` | `string?` | "Serves 2", "6 pieces" |
| `servingTemperature` | `ServingTemperature?` | hot / cold / room |
| `cookingMethod` | `string?` | "Hyderabadi dum", "Stone tawa" |
| `spiceLevel` | `SpiceLevel?` | none → extra_hot |

**`SpiceLevel`:** `none` | `mild` | `medium` | `hot` | `extra_hot`

---

### 2.9 Serving

| Field | Type | Description |
|---|---|---|
| `servingNotes` | `string?` | "Comes with raita and salan" |
| `popularPairingProductIds` | `FoodProductId[]` | Cross-sell references |
| `popularPairingLabel` | `string?` | Display text for pairing |

---

### 2.10 Nutrition

Value object: `ProductNutrition`

| Field | Type |
|---|---|
| `caloriesKcal` | `number?` |
| `proteinG` | `number?` |
| `carbsG` | `number?` |
| `fatG` | `number?` |
| `summary` | `string?` |
| `verified` | `boolean` |

---

### 2.11 Allergens

| Field | Type |
|---|---|
| `allergens` | `AllergenTag[]` |
| `allergenSummary` | `string?` |
| `containsDairy` | `boolean?` |
| `containsNuts` | `boolean?` |
| `containsGluten` | `boolean?` |

**`AllergenTag`:** standard EU/FSSAI aligned enum set.

---

### 2.12 Story

Value object: `ProductStory`

| Field | Type |
|---|---|
| `chefNote` | `string?` |
| `ingredients` | `string[]` |
| `originStory` | `string?` |
| `craftDetails` | `string?` |

Consumer storytelling panel renders only populated fields.

---

### 2.13 Labels

| Field | Type | Description |
|---|---|---|
| `labels` | `ProductLabel[]` | Owner-selected merchandising labels |

**`ProductLabel` (owner chooses, never hardcoded):**

`BESTSELLER` | `CHEF_PICK` | `NEW` | `LIMITED` | `FESTIVAL` | `HEALTHY` | `KIDS` | `POPULAR` | `SPICY` | `PROTEIN` | `SEASONAL` | `CUSTOM`

Custom labels: `{ kind: 'CUSTOM', text: string }`

Renderer maps label → display via owner-configured label catalog (defaults provided, text editable).

---

### 2.14 Offers

| Field | Type | Description |
|---|---|---|
| `productOfferId` | `OfferId?` | Product-scoped offer reference |
| `inlineOffer` | `ProductOffer?` | Embedded quick offer (alternative to shared Offer entity) |

See Deliverable 4. Consumer renders **`offer.text` only when `offer.enabled`**.

---

### 2.15 SEO

| Field | Type |
|---|---|
| `seoTitle` | `string?` |
| `seoDescription` | `string?` |
| `searchKeywords` | `string[]` |

---

### 2.16 Marketplace Metadata

| Field | Type |
|---|---|
| `marketplacePriority` | `number` |
| `marketplaceTags` | `string[]` |
| `dietaryClassification` | `DietaryClassification` |

**`DietaryClassification`:** `veg` | `non_veg` | `egg` | `vegan` | `jain` | `halal`

---

### 2.17 Analytics Metadata

| Field | Type |
|---|---|
| `analyticsSku` | `string?` |
| `conversionWeight` | `number?` |
| `marginCategory` | `string?` |

Not consumer-visible.

---

### 2.18 Discovery Metadata

| Field | Type |
|---|---|
| `discoveryBoost` | `number` |
| `mealTimeAffinity` | `MealTime[]` |
| `cuisineAffinity` | `CuisineTag[]` |

**`MealTime`:** `breakfast` | `lunch` | `snacks` | `dinner` | `late_night`

---

### 2.19 AI Metadata (future)

| Field | Type |
|---|---|
| `aiDescriptionDraft` | `string?` |
| `aiPairingSuggestions` | `FoodProductId[]` |
| `aiTags` | `string[]` |
| `aiGeneratedMedia` | `MediaAsset[]` |

Owner approves before marketplace publish. Never auto-render without approval flag.

---

### 2.20 Dietary (consumer-facing)

Derived from `dietaryClassification` + `labels` — never inferred by OrderBhojan from name heuristics.

---

## Deliverable 3 — Category Domain

### Aggregate root: `Category`

Categories are **owner-defined** merchandising structures.

| Field | Type | Description |
|---|---|---|
| `categoryId` | `CategoryId` | |
| `restaurantId` | `RestaurantId` | |
| `parentCategoryId` | `CategoryId?` | Hierarchy support |
| `name` | `string` | |
| `slug` | `Slug` | |
| `description` | `string?` | |
| `image` | `MediaAsset?` | Rail/chip image |
| `icon` | `CategoryIcon?` | Emoji or icon key |
| `displayOrder` | `number` | |
| `visibility` | `CategoryVisibility` | |
| `schedule` | `CategorySchedule?` | Time/day visibility |
| `marketplacePriority` | `number` | Discovery weight within restaurant |
| `productCount` | `number` | Denormalized count |

**`CategoryVisibility`:** `visible` | `hidden` | `scheduled`

**`CategorySchedule`:** `{ daysOfWeek[], startTime, endTime, festivalTag? }`

Hierarchy rules:
- Max depth: 2 (category → subcategory)
- Products attach to leaf categories only
- Parent categories are navigational groupings

---

## Deliverable 4 — Offer Domain

### Aggregate root: `Offer`

Offers are first-class domain entities, not checkout coupons.

| Field | Type | Description |
|---|---|---|
| `offerId` | `OfferId` | |
| `restaurantId` | `RestaurantId` | |
| `scope` | `OfferScope` | What it applies to |
| `scopeRefId` | `string?` | categoryId or foodProductId when scoped |
| `enabled` | `boolean` | **If false, render nothing** |
| `type` | `OfferType` | |
| `percentage` | `number?` | |
| `amount` | `Money?` | |
| `text` | `string` | **Consumer-visible copy — owner-authored** |
| `badge` | `string?` | Short pill text |
| `description` | `string?` | Longer detail |
| `priority` | `number` | Stacking order |
| `schedule` | `OfferSchedule` | |
| `conditions` | `OfferConditions` | Min order, first order, etc. |
| `autoApply` | `boolean` | Automatic vs display-only |
| `loyaltyCompatible` | `boolean` | Future |

**`OfferScope`:** `restaurant` | `category` | `product` | `cart` (future checkout)

**`OfferType`:** `percentage` | `flat_amount` | `bogo` | `free_delivery` | `free_item` | `bundle` | `festival` | `custom`

**`OfferSchedule`:** `{ start, end, recurring?, daysOfWeek?, mealTimes? }`

**Offer composition rules:**
- Restaurant page: highest-priority enabled restaurant-scoped offer for hero pill
- Product card: product offer > category offer > none
- Never compute `% OFF` in renderer — only display `offer.text`
- Scheduled offers auto-enable/disable by schedule engine

**Future loyalty:** `OfferConditions.loyaltyTierRequired`, `pointsMultiplier` — schema reserved, not rendered until loyalty domain exists.

---

## Deliverable 5 — Variant Domain

### Entity: `ProductVariant` (within Food Product aggregate)

| Field | Type | Description |
|---|---|---|
| `variantId` | `VariantId` | |
| `kind` | `VariantKind` | Semantic size |
| `label` | `string` | Owner display label |
| `pricing` | `ProductPricing` | Variant-specific prices |
| `availability` | `AvailabilityStatus` | Per-variant stock |
| `inventory` | `VariantInventory?` | Optional stock count |
| `displayOrder` | `number` | |
| `isDefault` | `boolean` | Pre-selected in sheet |

**`VariantKind`:** `small` | `medium` | `large` | `half` | `full` | `mini` | `family` | `regular` | `500gm` | `1kg` | `custom`

Owner may use any label; `kind` enables analytics normalization.

Dynamic pricing: variant `sellingPrice` participates in offer engine. Offer may target specific variant kinds.

---

## Deliverable 6 — Addon Domain

### Aggregate root: `AddonGroup`

Groups contain addon options with selection rules.

**AddonGroup**

| Field | Type | Description |
|---|---|---|
| `addonGroupId` | `AddonGroupId` | |
| `restaurantId` | `RestaurantId` | |
| `name` | `string` | "Extra toppings", "Choose your drink" |
| `selectionRule` | `AddonSelectionRule` | |
| `displayOrder` | `number` | |
| `options` | `AddonOption[]` | |

**`AddonSelectionRule`:**

| Field | Type |
|---|---|
| `required` | `boolean` |
| `minSelections` | `number` |
| `maxSelections` | `number` |
| `allowMultiplePerOption` | `boolean` |

**AddonOption**

| Field | Type |
|---|---|
| `addonOptionId` | `AddonOptionId` |
| `label` | `string` |
| `kind` | `string` | Semantic: extra_cheese, butter, soft_drink |
| `pricing` | `ProductPricing` | Usually additive price |
| `availability` | `AvailabilityStatus` |
| `maxQuantity` | `number?` |
| `displayOrder` | `number` |

Food Product references `addonGroupId[]` — groups are reusable within a restaurant.

**No global COMMON_ADDONS.** Each product explicitly links its groups.

---

## Deliverable 7 — Restaurant Theme

Value object: `RestaurantTheme` (part of Brand, projected to marketplace)

| Field | Type | Consumer use |
|---|---|---|
| `logo` | `MediaAsset` | Identity strip, cards |
| `coverImage` | `MediaAsset` | Restaurant hero |
| `primaryColor` | `ColorToken` | Accent buttons, links |
| `secondaryColor` | `ColorToken` | Backgrounds |
| `highlightColor` | `ColorToken` | Offer pills |
| `cardStyle` | `CardStyle` | Future marketplace card variant |
| `typographyPreference` | `TypographyPreference` | Future — not rendered until supported |

OrderBhojan applies theme tokens via BDS CSS variables — **values** come from domain, **application** is renderer responsibility.

---

## Deliverable 8 — Delivery Domain

### Aggregate root: `DeliveryPolicy`

| Field | Type | Description |
|---|---|---|
| `deliveryPolicyId` | `DeliveryPolicyId` | |
| `restaurantId` | `RestaurantId` | |
| `enabled` | `boolean` | |
| `zones` | `DeliveryZone[]` | Radius or polygon zones |
| `defaultPrepMinutes` | `number` | Base prep |
| `prepTimeBufferMinutes` | `number` | Peak buffer |
| `pickupConfig` | `PickupConfig` | |
| `thirdPartyProviders` | `DeliveryProvider[]` | Future: Dunzo, etc. |
| `scheduledDeliveryEnabled` | `boolean` | Future |

**DeliveryZone**

| Field | Type |
|---|---|
| `zoneId` | `ZoneId` |
| `name` | `string` |
| `radiusKm` | `number?` |
| `polygon` | `GeoPolygon?` |
| `baseFee` | `Money` |
| `perKmCharge` | `Money` |
| `freeDeliveryMinOrder` | `Money?` |
| `estimatedMinutesMin` | `number` |
| `estimatedMinutesMax` | `number` |
| `priority` | `number` |

ETA and fee are **computed at query time** from: consumer geo + zone + prep + traffic factor. Never hardcoded in OrderBhojan.

---

## Deliverable 9 — Business Hours

### Aggregate root: `BusinessSchedule`

| Field | Type | Description |
|---|---|---|
| `scheduleId` | `ScheduleId` | |
| `restaurantId` | `RestaurantId` | |
| `timezone` | `Timezone` | IANA, e.g. Asia/Kolkata |
| `weeklyHours` | `DaySchedule[]` | |
| `festivalOverrides` | `ScheduleOverride[]` | |
| `temporaryClosures` | `TemporaryClosure[]` | |
| `vacationMode` | `VacationMode?` | |
| `emergencyClosure` | `EmergencyClosure?` | |

**DaySchedule:** `{ dayOfWeek, openTime, closeTime, closed?, breaks?[] }`

**ScheduleOverride:** `{ date, openTime?, closeTime?, closed?, label? }` — festivals

**TemporaryClosure:** `{ start, end, reason, consumerMessage }`

**VacationMode:** `{ start, end, message, resumeAutomatically }`

**OperationalStatus derivation (domain service, not renderer):**

```
if emergencyClosure.active → emergency_closed
else if vacationMode.active → vacation
else if temporaryClosure.active → closed
else if manualPause → paused
else if within today's hours → open | closing_soon
else → closed
```

Consumer sees `operationalStatus` + optional `todayHoursLabel` — both from projection, never fabricated.

---

## Shared value objects

### `MediaAsset`

| Field | Type |
|---|---|
| `assetId` | `AssetId` |
| `url` | `URL` |
| `cdnUrl` | `URL` |
| `width` | `number` |
| `height` | `number` |
| `blurHash` | `string?` |
| `altText` | `string?` |
| `kind` | `image` \| `video` |

### `Money`

| Field | Type |
|---|---|
| `amount` | `number` (minor units or decimal — domain convention: decimal INR) |
| `currency` | `CurrencyCode` |

---

## Domain invariants (Rule Zero)

1. Consumer-visible text for offers comes from `Offer.text` — never computed
2. Product labels come from owner `labels[]` — never boolean → English mapping in renderer
3. Availability comes from `ProductAvailability.status` — never assumed
4. Gallery items require owner upload — no platform stock photos as business data
5. Variants and addons are product-specific — no restaurant-wide forced addons
6. Business hours determine open status — not a standalone boolean without schedule
7. Rating aggregates are read-only — owner cannot set consumer rating
8. If field is empty/null and no fallback defined in projection spec → **render nothing**

---

## Branch model (multi-location compatibility)

### Entity: `Branch`

| Field | Type |
|---|---|
| `branchId` | `BranchId` |
| `restaurantId` | `RestaurantId` |
| `name` | `string` |
| `branchType` | `cloud_kitchen` \| `dine_in` \| `delivery_hub` |
| `location` | `Address + GeoPoint` |
| `deliveryPolicyId` | `DeliveryPolicyId?` |
| `businessScheduleId` | `ScheduleId?` |
| `operationalStatus` | `OperationalStatus` |
| `menuScope` | `shared` \| `branch_specific` (future) |

Single-kitchen restaurants have exactly one branch (default). Chain HQ manages many branches.

---

*End of Product Domain. Projections derived in documents 05–08.*

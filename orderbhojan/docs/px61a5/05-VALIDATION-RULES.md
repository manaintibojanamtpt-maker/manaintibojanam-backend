# 05 — Validation Rules

Validation applies at **domain write** (Owner), **mapper emit** (Marketplace), and **contract deserialize** (client).

---

## Global constraints

| Rule | Constraint |
|---|---|
| schemaVersion | Must match supported version set; reject unknown MAJOR |
| Public IDs | Pattern `^ob[a-z]_[a-zA-Z0-9]{8,32}$` |
| Slug | Pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 64 chars |
| Money.amount | `>= 0`, max 999999.99, max 2 decimal places |
| Money.currency | ISO 4217 `[A-Z]{3}` |
| displayText / displayName | 1–120 chars, no HTML, trim whitespace |
| description / body | 0–2000 chars, plain text |
| URL | HTTPS only, valid URI |
| sortOrder / displayOrder | integer 0–9999 |
| priority | integer 0–1000 |

---

## RestaurantDTO v1.0

| Field | Required | Constraints |
|---|---|---|
| schemaVersion | ✓ | `"1.0"` |
| restaurantId | ✓ | Public ID format |
| slug | ✓ | Slug pattern, globally unique |
| displayName | ✓ | 1–80 chars |
| tagline | | 0–120 chars |
| description | | 0–2000 chars |
| theme | ✓ | Valid ThemeDTO |
| theme.logo | ✓ | Valid ImageDTO with url |
| cuisines | ✓ | 1–5 items, each 1–40 chars |
| priceBandLabel | | 0–20 chars |
| priceForTwo | | Valid MoneyDTO |
| dietaryTags | ✓ | Array (may be empty) |
| galleryPreview | ✓ | 0–4 GalleryDTO |
| delivery | ✓ | Valid RestaurantDeliveryDTO |
| delivery.deliveryEnabled | ✓ | boolean |
| businessHours | ✓ | Valid BusinessHoursSummaryDTO |
| businessHours.operationalStatus | ✓ | Valid enum |
| marketplace | ✓ | Valid RestaurantMarketplaceDTO |
| marketplace.offers | ✓ | All OfferDTO enabled |
| discovery | ✓ | Valid RestaurantDiscoveryDTO |

**Publish gate:** Restaurant cannot be `listed` without: displayName, theme.logo, ≥1 cuisine, delivery block, businessHours.

---

## FoodDTO v1.0

| Field | Required | Constraints |
|---|---|---|
| schemaVersion | ✓ | `"1.0"` |
| foodId | ✓ | Public ID |
| slug | ✓ | Unique per restaurant |
| restaurantId | ✓ | Valid public restaurant ID |
| categoryId | ✓ | Valid public category ID |
| name | ✓ | 1–100 chars |
| subtitle | | 0–120 chars |
| description | | 0–500 chars (consumer 1-line derived in renderer) |
| displayOrder | ✓ | 0–9999 |
| media.hero | ✓ | Valid ImageDTO — **required for visible products** |
| media.gallery | ✓ | 0–8 images |
| pricing.regularPrice | ✓ | amount > 0 |
| pricing.sellingPrice | | amount > 0, amount <= regularPrice |
| pricing.mrp | | amount >= regularPrice |
| pricing.taxIncluded | ✓ | boolean |
| availability.status | ✓ | Valid enum |
| labels | ✓ | 0–6 labels, unique kind |
| offer | | If present, valid enabled OfferDTO |
| variants | ✓ | 0–12; if >0 exactly one isDefault |
| addonGroups | ✓ | 0–8 groups |
| story | | Optional block |
| metadata.dietary | ✓ | Valid enum |

**Visibility gate:** `status !== hidden` requires hero image.

**Variant gate:** Each variant `priceDelta.amount >= 0`; if `absolutePrice` set, amount > 0.

---

## CategoryDTO v1.0

| Field | Required | Constraints |
|---|---|---|
| schemaVersion | ✓ | `"1.0"` |
| categoryId | ✓ | Public ID |
| slug | ✓ | Unique per restaurant |
| name | ✓ | 1–60 chars |
| displayOrder | ✓ | 0–9999 |
| visibility | ✓ | enum |
| itemCount | ✓ | >= 0 |
| schedule | | Required when visibility = scheduled |
| parentCategoryId | | Must reference existing category; no cycles |

---

## OfferDTO v1.0

| Field | Required | Constraints |
|---|---|---|
| schemaVersion | ✓ | `"1.0"` |
| offerId | ✓ | Public ID |
| enabled | ✓ | Must be `true` in contract output |
| displayText | ✓ | 1–60 chars — **mandatory** |
| badge | | 0–24 chars |
| description | | 0–200 chars |
| priority | ✓ | 0–1000 |
| validity | ✓ | Valid OfferValidityDTO |
| type | ✓ | Valid enum |

**Domain write gate:** Cannot save `enabled: true` without `displayText`.

**Mapper gate:** Exclude offers outside validity window.

---

## VariantDTO v1.0

| Field | Required | Constraints |
|---|---|---|
| schemaVersion | ✓ | `"1.0"` |
| variantId | ✓ | Public ID |
| kind | ✓ | enum |
| displayName | ✓ | 1–40 chars |
| priceDelta | ✓ | Valid MoneyDTO, amount >= 0 |
| absolutePrice | | If set, amount > 0 |
| availability | ✓ | Valid FoodAvailabilityDTO |
| sortOrder | ✓ | 0–99 |
| isDefault | ✓ | boolean |

---

## AddonGroupDTO v1.0

| Field | Required | Constraints |
|---|---|---|
| schemaVersion | ✓ | `"1.0"` |
| groupId | ✓ | Public ID |
| displayName | ✓ | 1–60 chars |
| selectionRules | ✓ | Valid rules |
| selectionRules.minSelections | ✓ | 0–10 |
| selectionRules.maxSelections | ✓ | >= minSelections, <= 10 |
| options | ✓ | 1–20 AddonOptionDTO |

**Rule:** If `required: true`, then `minSelections >= 1`.

---

## AddonOptionDTO v1.0

| Field | Required | Constraints |
|---|---|---|
| schemaVersion | ✓ | `"1.0"` |
| optionId | ✓ | Public ID |
| displayName | ✓ | 1–60 chars |
| kind | ✓ | 1–40 chars snake_case |
| pricing.price | ✓ | Valid MoneyDTO |
| sortOrder | ✓ | 0–99 |
| maxQuantity | | 1–10 if set |

---

## ThemeDTO v1.0

| Field | Required | Constraints |
|---|---|---|
| schemaVersion | ✓ | `"1.0"` |
| logo | ✓ | Valid ImageDTO |
| cover | | Valid ImageDTO |
| colors.primary | | `#RRGGBB` hex |
| brandAssets | ✓ | 0–8 items |

---

## GalleryDTO v1.0

| Field | Required | Constraints |
|---|---|---|
| schemaVersion | ✓ | `"1.0"` |
| galleryItemId | ✓ | Public ID |
| image | ✓ | Valid ImageDTO |
| caption | | 0–120 chars |
| sortOrder | ✓ | 0–999 |
| visibility | ✓ | enum |

---

## FoodMenuDTO v1.0

| Field | Required | Constraints |
|---|---|---|
| schemaVersion | ✓ | `"1.0"` |
| slug | ✓ | Matches restaurant |
| restaurantName | ✓ | 1–80 chars |
| theme | ✓ | Valid ThemeDTO |
| categories | ✓ | 1–50 CategoryDTO, sorted by displayOrder |
| items | ✓ | 0–500 FoodDTO, sorted by category then displayOrder |
| featuredFoodIds | ✓ | Each ID must exist in items |
| todaysSpecialFoodIds | ✓ | Each ID must exist in items |

---

## Enum reference (v1.0)

See [01-DTO-SPECIFICATION.md](./01-DTO-SPECIFICATION.md) for complete enum lists:

- `OperationalStatus`
- `FoodAvailabilityStatus`
- `CategoryVisibility`
- `OfferType`
- `VariantKind`
- `LabelKind`
- `BadgeKind`
- `DietaryClassification`
- `SpiceLevel`
- `GalleryKind`

Unknown enum values at client: treat as opaque string, hide specialized UI (see Compatibility Guide).

---

## Validation error codes

Mapped to [MarketplaceErrorDTO](./01-DTO-SPECIFICATION.md#error-contracts) — see section below in 01 or error section here.

| Code | When |
|---|---|
| `VALIDATION_FAILED` | Schema / constraint violation |
| `REQUIRED_FIELD_MISSING` | Publish gate failed |
| `INVALID_REFERENCE` | categoryId / foodId not found |
| `DUPLICATE_SLUG` | Slug conflict |
| `OFFER_TEXT_REQUIRED` | enabled offer without displayText |

---

*Validation protects Rule Zero: invalid owner data never reaches consumer contracts.*

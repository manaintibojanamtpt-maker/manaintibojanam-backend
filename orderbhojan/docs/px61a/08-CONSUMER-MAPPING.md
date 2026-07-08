# 08 — Consumer Mapping

OrderBhojan render rules: **what** to show, **where**, and **condition** — never **invent**.

---

## Renderer ownership

| OrderBhojan owns | BhojanOS owns |
|---|---|
| Layout, spacing, motion | All business values |
| BlurHash / srcset application | Image URLs |
| Accessibility labels (chrome) | Product names, descriptions |
| Responsive breakpoints | Prices, offers, labels |
| Empty states (no data) | Hours, availability |
| Loading / error UX | Gallery, theme colors |

---

## Restaurant Experience (PX5)

| UI element | DTO source | Render rule |
|---|---|---|
| Hero cover | `RestaurantDTO.cover` / `ThemeDTO` | `AppetiteImage`; no manifest fallback |
| Logo | `ThemeDTO.logo` | |
| Display name | `RestaurantDTO.displayName` | |
| Cuisine line | `RestaurantDTO.cuisines[]` | Join with ` · `, max 3 — **display policy only** |
| Rating pill | `RestaurantDTO.rating` | Hide if null |
| ETA badge | `DeliveryQuoteDTO.eta` or `RestaurantDTO.eta` | Format `{min}–{max} min` |
| Distance | `DeliveryQuoteDTO.distanceKm` | Format `{n} km` |
| Delivery fee | `DeliveryQuoteDTO.deliveryFee` | `Free delivery` if null/0 |
| Open status pill | `OperationalStatusDTO` | Map to label via i18n |
| Offer hero pill | `RestaurantDTO.primaryOffer` | `renderOffer()` — text only |
| Cloud / verified badge | `BadgeDTO[]` | Render `badge.label` |
| Description | `RestaurantExperienceDTO.description` | Hide if empty |
| Gallery rail | `GalleryDTO[]` | Hide section if empty |
| Highlights | `HighlightDTO[]` | Hide if empty |
| Hours table | `DayHoursDTO[]` | Hide if empty |
| Policies | `PolicyDTO[]` | Hide if empty |
| Open Menu CTA | Platform UX | Links to menu route |

---

## Food Experience (PX6)

| UI element | DTO source | Render rule |
|---|---|---|
| Identity strip name | `FoodMenuDTO.restaurantName` | |
| Identity strip logo | `FoodMenuDTO.theme.logo` | |
| Category rail | `CategoryDTO[]` | Sticky; scroll-spy by category id |
| Category chip image | `CategoryDTO.image` | Hide image if null |
| Signature rail | `FoodMenuDTO.featuredIds` → resolve `FoodDTO` | Hide if empty |
| Product row name | `FoodDTO.name` | |
| Product description | `FoodDTO.description` | 1-line clamp |
| Product hero thumb | `FoodDTO.hero` | AppetiteImage + blurHash |
| Regular price | `FoodDTO.pricing.regularPrice` | |
| Selling price | `FoodDTO.pricing.sellingPrice` | Show struck regular if present |
| Offer badge | `FoodDTO.offer` | **`offer.text` only** |
| Labels | `FoodDTO.labels[]` | **`label.text` only** — no bool mapping |
| Dietary badge | `FoodDTO.dietary.classification` | Map to veg/non-veg icon |
| Rating | `FoodDTO.rating` | Hide if null |
| Spice | `FoodDTO.preparation.spiceLevel` | Hide if null |
| Prep time | `FoodDTO.preparation.estimatedMinutes` | Hide if null |
| Sold out | `FoodDTO.availability.status` | Show when `out_of_stock` |
| Add button | `availability.status === 'available'` | Disable otherwise |
| Customize sheet variants | `FoodDTO.variants[]` | SegmentedControl or list |
| Customize sheet addons | `FoodDTO.addonGroups[]` | Enforce min/max selections |
| Live price | Sum selection pricing | **Uses DTO prices only** |
| Story panel | `FoodDTO.story`, nutrition, allergens | Hide empty sections |
| Floating preview | Local preview store | Count + total from selections |

---

## Home Experience (PX4)

| UI element | DTO source | Render rule |
|---|---|---|
| Hero banner | Platform campaign API (future) or hide | Not hardcoded `mockCatalog` |
| Category chips | Platform taxonomy OR owner categories aggregate | |
| Restaurant posters | `RestaurantDTO[]` from discovery | |
| Trending dishes | `FoodDTO[]` from discovery collection | |
| Trust strip | Platform marketing | OK — not owner business data |

---

## Discovery cards

| UI element | DTO source | Render rule |
|---|---|---|
| Cover, name, rating | `RestaurantDTO` | |
| Offer badge | `RestaurantDTO.primaryOffer.badge` or `text` | Not generic `"Offer"` |
| Closed overlay | `operationalStatus !== 'open'` | |
| Cloud badge | `BadgeDTO` where kind = cloud_kitchen | |

---

## Formatter migration (PX6.1E)

| Current formatter | Action |
|---|---|
| `formatOfferLabel()` (% math) | **Remove** — use `OfferDTO.text` |
| `formatFoodPrice()` | Keep — formats `Money` from DTO |
| `dietaryLabel()` | Keep — maps DTO enum to icon class |
| `spiceLabel()` | Keep OR use owner label from `labels[]` |
| `formatOpenStatusLabel()` | Keep — maps `OperationalStatusDTO` to i18n |
| `formatDeliveryFeeLabel()` | Keep — formats numeric DTO |
| `formatEtaLabel()` | Keep — formats numeric DTO |
| `formatPriceRange()` thresholds | **Remove** — use `priceBandLabel` from DTO |
| Boolean → "Bestseller" | **Remove** — use `LabelDTO.text` |

---

## Conditional render standard library

```typescript
// OrderBhojan render helpers (PX6.1E)
renderIfOffer(offer?: OfferDTO): ReactNode
renderIfLabels(labels: LabelDTO[]): ReactNode
renderIfNonEmpty<T>(items: T[], render: (items: T[]) => ReactNode): ReactNode
renderPrice(pricing: PricingDTO): ReactNode
renderAvailability(status: AvailabilityDTO): ReactNode
```

---

## Fallback policy

| Missing DTO field | Renderer behavior |
|---|---|
| `offer` | No offer badge |
| `labels` empty | No label badges |
| `rating` | No rating display |
| `gallery` empty | No gallery section |
| `featuredIds` empty | No signature rail |
| `hero` image | Neutral surface placeholder (no stock food photo) |
| `description` | Omit line |
| `variants` empty | Direct add flow |
| `addonGroups` empty | Omit addon sections |

**Never:** fall back to mock catalog, photo manifest, or computed offer text.

---

## Feature flag behavior

| Flag | Data path |
|---|---|
| `FF_OB_MENU` | `GET /restaurants/:slug/menu` → `FoodMenuDTO` |
| `FF_OB_RESTAURANT` | `GET /restaurants/:slug` → `RestaurantExperienceDTO` |
| `FF_OB_DISCOVERY` | Discovery endpoints → `RestaurantDTO[]` |
| `FF_OB_FIRESTORE_*` (future) | Same endpoints, Firestore-backed |

Renderer code **identical** regardless of backend — only DTO source changes.

---

## Certification checklist (PX6.1G)

- [ ] Grep OrderBhojan for `placehold`, `mockCatalog`, `COMMON_ADDONS`, `formatOfferLabel`
- [ ] Grep for `"Bestseller"`, `"Chef recommended"`, `"% OFF"` literals in food UI
- [ ] Every Badge text traceable to DTO field in test fixture
- [ ] Owner changes price → E2E consumer update within cache TTL
- [ ] Owner disables offer → badge absent in snapshot test

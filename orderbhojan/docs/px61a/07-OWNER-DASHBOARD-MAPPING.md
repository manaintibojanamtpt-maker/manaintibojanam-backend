# 07 — Owner Dashboard Mapping

Every consumer-facing value → owner editable screen.

**Rule:** If OrderBhojan shows it, Owner must configure it.

---

## Navigation structure (proposed)

```
Owner Dashboard
├── Storefront          ← NEW primary hub (marketplace-facing)
│   ├── Profile
│   ├── Brand & Theme
│   ├── Gallery
│   ├── Highlights
│   └── Merchandising (featured / today's specials)
├── Menu                ← Elevated from "Menu Management"
│   ├── Categories
│   ├── Products
│   ├── Addon Groups
│   └── Import / Bulk edit
├── Offers              ← NEW (marketplace offers, not checkout coupons)
├── Operations
│   ├── Live Status
│   ├── Business Hours
│   ├── Closures & Vacation
│   └── Delivery & Pickup
├── Locations           ← Branches (single or multi)
├── Promotions          ← Existing coupons (checkout) — separate module
├── Settings            ← Account, payments, tax, compliance
└── Analytics           ← Read-only (future)
```

---

## Screen mapping matrix

| Consumer surface | Domain field(s) | Owner screen | Current BhojanOS |
|---|---|---|---|
| Restaurant name | `displayName` | Storefront → Profile | ✅ Settings (partial) |
| Tagline | `tagline` | Storefront → Profile | ❌ |
| Description | `description` | Storefront → Profile | ❌ |
| Cuisines | `cuisineTags[]` | Storefront → Profile | ❌ |
| Logo | `brand.logo` | Brand & Theme | ✅ logoUrl |
| Cover image | `brand.coverImage` | Brand & Theme | ❌ |
| Brand colors | `brand.primaryColor`, etc. | Brand & Theme | ⚠️ partial |
| Gallery images + captions | `gallery[]` | Storefront → Gallery | ❌ |
| Highlights | `highlights[]` | Storefront → Highlights | ❌ |
| Featured dishes | `featuredProductIds[]` | Storefront → Merchandising | ❌ |
| Today's specials | `todaysSpecialProductIds[]` | Storefront → Merchandising | ❌ |
| Listing badges | `listingBadges[]` | Storefront → Profile | ❌ |
| Price band | `priceBand` / `priceBandLabel` | Storefront → Profile | ❌ |
| Open / closed status | `operationalStatus` | Operations → Live Status | ✅ StoreLiveControl |
| Offline message | `offlineMessage` | Operations → Live Status | ✅ |
| Weekly hours | `weeklyHours[]` | Operations → Business Hours | ⚠️ single window |
| Festival overrides | `festivalOverrides[]` | Operations → Business Hours | ❌ |
| Vacation mode | `vacationMode` | Operations → Closures | ❌ |
| Emergency closure | `emergencyClosure` | Operations → Live Status | ❌ |
| Delivery enabled | `deliveryPolicy.enabled` | Operations → Delivery | ✅ |
| Delivery zones / fees | `deliveryZones[]` | Operations → Delivery | ⚠️ partial |
| Pickup | `pickupConfig` | Operations → Delivery | ❌ |
| Minimum order | `minimumOrderAmount` | Operations → Delivery | ⚠️ freeDeliveryMinOrder |
| Packaging fee | `packagingFee` | Settings → Pricing | ✅ |
| Prep time default | `defaultPrepMinutes` | Operations → Delivery | ✅ prepTime |
| Restaurant offers | `Offer` (restaurant scope) | Offers → Restaurant offers | ❌ |
| Category name | `Category.name` | Menu → Categories | ❌ (string on item) |
| Category image | `Category.image` | Menu → Categories | ❌ |
| Category order | `displayOrder` | Menu → Categories (drag) | ❌ |
| Category visibility | `visibility`, `schedule` | Menu → Categories | ❌ |
| Product name | `FoodProduct.name` | Menu → Product editor | ✅ |
| Product description | `description` | Menu → Product editor | ✅ |
| Product images | `media` | Menu → Product editor → Media | ⚠️ single image |
| Regular price | `pricing.regularPrice` | Menu → Product editor → Pricing | ✅ price |
| Selling price / offer | `pricing.sellingPrice` + `Offer` | Menu → Product editor → Offer | ⚠️ discount field |
| MRP | `pricing.mrp` | Menu → Product editor → Pricing | ❌ |
| Labels | `labels[]` | Menu → Product editor → Labels | ❌ |
| Dietary | `dietaryClassification` | Menu → Product editor | ✅ type |
| Availability | `availability.status` | Menu → Product editor | ✅ isAvailable |
| Inventory | `inventory` | Menu → Product editor → Inventory | ⚠️ type only |
| Prep time | `preparation.estimatedMinutes` | Menu → Product editor → Preparation | ❌ |
| Serving size | `preparation.servingSize` | Menu → Product editor → Preparation | ❌ |
| Spice level | `preparation.spiceLevel` | Menu → Product editor → Preparation | ❌ |
| Chef note / story | `story.*` | Menu → Product editor → Story | ❌ |
| Ingredients | `story.ingredients[]` | Menu → Product editor → Story | ❌ |
| Nutrition / allergens | `nutrition`, `allergens` | Menu → Product editor → Nutrition | ❌ |
| Variants | `variants[]` | Menu → Product editor → Sizes | ❌ |
| Addon groups | `addonGroupIds[]` | Menu → Addon Groups + Product link | ❌ |
| Product offer | `Offer` (product scope) | Offers OR Product → Offer tab | ❌ |
| Category offer | `Offer` (category scope) | Offers → Category offers | ❌ |
| Pairing | `popularPairing*` | Menu → Product editor → Pairing | ❌ |

---

## Product editor (UX sections)

Single product screen with tabs — all consumer Food Experience fields editable:

| Tab | Fields |
|---|---|
| **Basics** | name, subtitle, description, category, visibility, display order |
| **Media** | hero upload, gallery, alt text |
| **Pricing** | regular, MRP, selling, tax included |
| **Offer** | Link/create product offer, preview consumer text |
| **Labels** | Multi-select from catalog + custom |
| **Dietary** | Classification + dietary labels |
| **Availability** | Status, schedule, inventory |
| **Sizes** | Variant CRUD with per-variant price/availability |
| **Add-ons** | Link groups, preview selection rules |
| **Preparation** | Time, serving, spice, cooking method |
| **Story** | Chef note, ingredients, origin |
| **Nutrition** | Calories, summary, allergens |
| **Pairing** | Cross-sell products |
| **Preview** | Live OrderBhojan card preview (read-only renderer) |

---

## Offer manager (UX)

| View | Purpose |
|---|---|
| All offers | List with enable toggle, schedule, scope |
| Create offer | Wizard: scope → type → text/badge → schedule → conditions |
| Preview | Shows exact consumer pill text |

**Mandatory field:** `text` when enabled. Save blocked without consumer copy.

---

## Category manager (UX)

- Drag-and-drop ordering
- Tree view (parent → child)
- Image upload per category
- Visibility schedule picker
- Product count badge

---

## Storefront preview

Embedded iframe or native preview using **same Marketplace DTO + OrderBhojan renderer** — owner sees exactly what consumer sees.

---

## Gaps vs current Owner portal

| Priority | Screen | Effort |
|---|---|---|
| P0 | Storefront Profile + Brand | Medium |
| P0 | Category manager | Medium |
| P0 | Product editor expansion (variants, addons, labels, offer) | Large |
| P0 | Marketplace Offers manager | Medium |
| P1 | Gallery + Highlights | Medium |
| P1 | Business hours (weekly + festival) | Medium |
| P1 | Merchandising (featured/specials) | Small |
| P2 | Branch manager | Large |
| P2 | Nutrition / allergens | Small |
| P2 | Product story tab | Small |

---

## Checkout coupons (unchanged scope)

`OwnerPromotionsPanel` / `coupons` collection remains for **checkout discount codes**.  
Does NOT replace marketplace `Offer` entity. Separate UI, separate domain.

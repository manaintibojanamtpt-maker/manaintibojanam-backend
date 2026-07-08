# 05 — Firestore Projection

**Derived from domain — not designed first.**  
Implementation in PX6.1B. This document specifies shape only.

---

## Design principles

1. One aggregate → one primary collection (or subcollection tree)
2. Tenant isolation via `restaurantId` on every document
3. Denormalize for read performance only at projection layer, not in domain writes
4. Never embed full menu inside restaurant document
5. Security rules enforce `ownerId` / `restaurantId` ownership

---

## Collection map

| Collection path | Domain aggregate | Document ID |
|---|---|---|
| `restaurants/{restaurantId}` | Restaurant (core) | `restaurantId` |
| `restaurants/{restaurantId}/branches/{branchId}` | Branch | `branchId` |
| `restaurants/{restaurantId}/categories/{categoryId}` | Category | `categoryId` |
| `restaurants/{restaurantId}/products/{productId}` | FoodProduct | `productId` |
| `restaurants/{restaurantId}/addonGroups/{groupId}` | AddonGroup | `groupId` |
| `restaurants/{restaurantId}/offers/{offerId}` | Offer | `offerId` |
| `restaurants/{restaurantId}/schedules/{scheduleId}` | BusinessSchedule | `scheduleId` |
| `restaurants/{restaurantId}/deliveryPolicies/{policyId}` | DeliveryPolicy | `policyId` |
| `restaurants/{restaurantId}/media/{assetId}` | MediaAsset registry | `assetId` |

### Migration note: existing `tenants/{slug}` + `menu/{itemId}`

| Legacy path | Target path | Strategy |
|---|---|---|
| `tenants/{slug}` | `restaurants/{restaurantId}` | Migrate identity, brand, delivery, schedule refs |
| `menu/{itemId}` | `restaurants/{id}/products/{productId}` | Migrate items; add tenantId → restaurantId |
| `categories/{id}` | `restaurants/{id}/categories/{categoryId}` | Scope by tenant; owner write rules |

Slug remains indexed field on restaurant document for URL lookup.

---

## Document sketches (illustrative)

### `restaurants/{restaurantId}`

```typescript
{
  restaurantId, publicId, slug,
  legalName, displayName, tagline, description,
  businessType, lifecycleStatus, marketplaceStatus,
  brand: { logoAssetId, coverAssetId, primaryColor, ... },
  defaultBranchId,
  cuisineTags: string[],
  priceBand, priceForTwoEstimate,
  deliveryPolicyId, scheduleId,
  marketplace: {
    featuredProductIds: string[],
    todaysSpecialProductIds: string[],
    highlights: [...],
    gallery: [{ assetId, caption, kind, sortOrder }],
    listingBadges: string[],
  },
  compliance: { fssaiNumber, fssaiStatus, ... },
  ownerId, createdAt, updatedAt, publishedAt
}
```

### `restaurants/{id}/products/{productId}`

```typescript
{
  productId, publicId, slug, restaurantId, categoryId,
  name, subtitle, description,
  media: { heroAssetId, galleryAssetIds: [] },
  pricing: { regularPrice, sellingPrice, mrp, currency, taxIncluded },
  availability: { status, schedule?, soldOutUntil? },
  inventory?: { stockCount, lowStockThreshold, autoHideWhenZero },
  hasVariants, variants: [{ variantId, kind, label, pricing, availability, isDefault, displayOrder }],
  addonGroupIds: string[],
  preparation: { estimatedMinutes, servingSize, spiceLevel, cookingMethod },
  story: { chefNote, ingredients, ... },
  nutrition?, allergens?,
  labels: string[],
  productOfferId?,
  dietaryClassification,
  displayOrder, visibility, lifecycleStatus,
  discoveryMetadata?, analyticsMetadata?,
  updatedAt
}
```

### `restaurants/{id}/offers/{offerId}`

```typescript
{
  offerId, restaurantId,
  scope: 'restaurant' | 'category' | 'product',
  scopeRefId?,
  enabled, type, percentage?, amount?,
  text, badge?, description?,
  priority, schedule: { start, end, recurring?, daysOfWeek? },
  conditions: { minOrderAmount?, firstOrderOnly? },
  autoApply, loyaltyCompatible,
  updatedAt
}
```

---

## Relationships (Firestore)

| From | To | Mechanism |
|---|---|---|
| Product → Category | `categoryId` field | Reference |
| Product → AddonGroup | `addonGroupIds[]` | Reference |
| Product → Offer | `productOfferId` OR query `offers where scopeRefId` | Reference |
| Restaurant → Products | Subcollection | Parent path |
| Restaurant → Featured | `featuredProductIds[]` | Reference array |

---

## Indexes (derived from query patterns)

| Query | Index |
|---|---|
| Products by restaurant + category + displayOrder | `(restaurantId, categoryId, displayOrder)` |
| Products by restaurant + visibility | `(restaurantId, visibility, lifecycleStatus)` |
| Offers by restaurant + enabled + scope | `(restaurantId, enabled, scope, priority DESC)` |
| Categories by restaurant + parent + order | `(restaurantId, parentCategoryId, displayOrder)` |
| Restaurant by slug | `(slug)` unique |
| Restaurant by marketplaceStatus + geo | Geohash composite (discovery) |

---

## Validation rules (domain → Firestore write guard)

| Rule | Enforced at |
|---|---|
| `offer.text` required when `enabled` | Domain service before write |
| Product visible requires heroAssetId | Domain service |
| Category delete blocked if products exist | Domain service |
| `labels[]` values from allowed enum + custom | Schema validation |
| Price >= 0 | Schema validation |
| Slug unique globally | Transaction / unique index |

---

## Ownership (security rules projection)

```
match /restaurants/{restaurantId} {
  allow read: if true;  // public marketplace reads via API, not direct
  allow write: if isOwner(restaurantId) || isPlatformAdmin();

  match /products/{productId} {
    allow read: if true;
    allow write: if isOwner(restaurantId);
  }
  // same pattern for categories, offers, addonGroups, schedules, deliveryPolicies
}
```

Direct Firestore reads from OrderBhojan client: **forbidden**. All consumer access via Marketplace API projection.

---

## Media storage

| Layer | Storage |
|---|---|
| Upload | Firebase Storage `restaurants/{id}/media/{assetId}` |
| Document | `media/{assetId}` metadata + CDN URL |
| Domain | `MediaAsset` value object |

BlurHash generated at upload pipeline; stored on asset document.

---

## Denormalization (projection-only copies)

| Field | Source | Copy location | Invalidation |
|---|---|---|---|
| `category.productCount` | count(products) | category doc | On product create/delete/move |
| `restaurant.ratingSummary` | reviews service | restaurant doc | Event-driven |
| Marketplace menu cache | full projection | Redis / optional | On any menu mutation event |

Domain writes stay normalized. Denormalization happens in projection workers (PX6.1D).

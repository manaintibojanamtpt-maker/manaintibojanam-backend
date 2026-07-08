# 06 — Event Contracts

Future domain event payloads for projection invalidation and downstream sync.  
**Design only — no implementation, no message bus selection.**

---

## Event envelope (all events)

```typescript
interface DomainEventEnvelope {
  readonly schemaVersion: '1.0';
  readonly eventId: string;              // UUID
  readonly eventType: string;            // e.g. "RestaurantUpdated"
  readonly occurredAt: string;           // ISO 8601
  readonly aggregateType: AggregateType;
  readonly aggregateId: string;           // domain internal ID — NOT public API ID
  readonly restaurantId: string;        // domain restaurant scope
  readonly payloadSchemaVersion: '1.0';
  readonly payload: unknown;            // typed per event below
  readonly causationId?: string;
  readonly correlationId?: string;
}

type AggregateType =
  | 'restaurant' | 'branch' | 'food_product' | 'category'
  | 'offer' | 'addon_group' | 'business_schedule' | 'delivery_policy'
  | 'theme' | 'gallery';
```

**Note:** Events use **domain internal IDs**. Public DTO IDs are resolved by projection workers — never leaked in event bus to external consumers without mapping.

---

## RestaurantUpdated v1.0

Emitted when restaurant identity, brand, marketplace config, or discovery metadata changes.

```typescript
interface RestaurantUpdatedPayload {
  readonly schemaVersion: '1.0';
  readonly restaurantId: string;
  readonly slug: string;
  readonly changedFields: readonly RestaurantField[];
  readonly marketplaceVisibility?: string;
}

type RestaurantField =
  | 'identity' | 'brand' | 'theme' | 'description' | 'cuisines'
  | 'delivery_policy_ref' | 'schedule_ref' | 'marketplace'
  | 'discovery' | 'gallery' | 'highlights' | 'policies';
```

**Subscribers:** Marketplace projection cache, search index, OrderBhojan CDN purge (future).

---

## FoodUpdated v1.0

```typescript
interface FoodUpdatedPayload {
  readonly schemaVersion: '1.0';
  readonly foodProductId: string;
  readonly restaurantId: string;
  readonly categoryId: string;
  readonly publicFoodId: string;
  readonly changedFields: readonly FoodField[];
  readonly availabilityStatus?: string;
}

type FoodField =
  | 'identity' | 'media' | 'pricing' | 'availability' | 'labels'
  | 'offer_ref' | 'variants' | 'addon_groups' | 'story'
  | 'nutrition' | 'allergens' | 'metadata' | 'visibility' | 'display_order';
```

**Subscribers:** Menu projection, featured/today's special validation, search food index.

---

## OfferUpdated v1.0

```typescript
interface OfferUpdatedPayload {
  readonly schemaVersion: '1.0';
  readonly offerId: string;
  readonly restaurantId: string;
  readonly scope: 'restaurant' | 'category' | 'product';
  readonly scopeRefId?: string;
  readonly enabled: boolean;
  readonly displayText?: string;
  readonly changedFields: readonly OfferField[];
}

type OfferField =
  | 'enabled' | 'display_text' | 'badge' | 'schedule'
  | 'priority' | 'type' | 'conditions';
```

**Subscribers:** Restaurant projection, affected FoodDTO projections, offer cache purge.

**Critical:** When `enabled: false`, subscribers must remove offer from all consumer DTO caches.

---

## CategoryUpdated v1.0

```typescript
interface CategoryUpdatedPayload {
  readonly schemaVersion: '1.0';
  readonly categoryId: string;
  readonly restaurantId: string;
  readonly changedFields: readonly CategoryField[];
  readonly visibility?: string;
}

type CategoryField =
  | 'name' | 'image' | 'icon' | 'display_order' | 'visibility'
  | 'schedule' | 'parent' | 'item_count';
```

**Subscribers:** FoodMenuDTO rebuild, category rail cache.

---

## GalleryUpdated v1.0

```typescript
interface GalleryUpdatedPayload {
  readonly schemaVersion: '1.0';
  readonly restaurantId: string;
  readonly operation: 'added' | 'removed' | 'reordered' | 'updated';
  readonly galleryItemIds: readonly string[];
  readonly changedFields?: readonly ('caption' | 'image' | 'visibility' | 'sort_order')[];
}
```

**Subscribers:** RestaurantExperienceDTO gallery, CDN cache.

---

## ThemeUpdated v1.0

```typescript
interface ThemeUpdatedPayload {
  readonly schemaVersion: '1.0';
  readonly restaurantId: string;
  readonly changedFields: readonly ThemeField[];
}

type ThemeField =
  | 'logo' | 'cover' | 'primary_color' | 'secondary_color'
  | 'highlight_color' | 'brand_assets';
```

**Subscribers:** ThemeDTO cache, OrderBhojan theme token refresh.

---

## Additional events (reserved v1.0)

### BusinessScheduleUpdated

```typescript
interface BusinessScheduleUpdatedPayload {
  readonly schemaVersion: '1.0';
  readonly restaurantId: string;
  readonly scheduleId: string;
  readonly operationalStatus: string;
  readonly changedFields: readonly ('weekly_hours' | 'festival_override' | 'vacation' | 'emergency' | 'manual_toggle')[];
}
```

### DeliveryPolicyUpdated

```typescript
interface DeliveryPolicyUpdatedPayload {
  readonly schemaVersion: '1.0';
  readonly restaurantId: string;
  readonly deliveryPolicyId: string;
  readonly changedFields: readonly ('zones' | 'fees' | 'prep_time' | 'enabled' | 'pickup')[];
}
```

### AddonGroupUpdated

```typescript
interface AddonGroupUpdatedPayload {
  readonly schemaVersion: '1.0';
  readonly addonGroupId: string;
  readonly restaurantId: string;
  readonly linkedFoodProductIds: readonly string[];
  readonly changedFields: readonly ('name' | 'options' | 'selection_rules')[];
}
```

### FoodProductAvailabilityChanged

```typescript
interface FoodProductAvailabilityChangedPayload {
  readonly schemaVersion: '1.0';
  readonly foodProductId: string;
  readonly restaurantId: string;
  readonly previousStatus: string;
  readonly newStatus: string;
}
```

High-frequency — may be debounced for projection.

---

## Event ordering guarantees

| Guarantee | Policy |
|---|---|
| Per aggregate | Total order preserved |
| Cross aggregate | Causal order via correlationId |
| At-least-once delivery | Projections must be idempotent |
| Dedup key | `eventId` |

---

## Projection invalidation map

| Event | Invalidate |
|---|---|
| RestaurantUpdated | `RestaurantDTO`, `RestaurantExperienceDTO` |
| FoodUpdated | `FoodDTO`, `FoodMenuDTO` |
| OfferUpdated | `OfferDTO`, `RestaurantDTO`, affected `FoodDTO` |
| CategoryUpdated | `CategoryDTO`, `FoodMenuDTO` |
| GalleryUpdated | `GalleryDTO[]`, `RestaurantDTO.galleryPreview` |
| ThemeUpdated | `ThemeDTO` on restaurant + menu |
| BusinessScheduleUpdated | `BusinessHoursSummaryDTO`, operational status |
| DeliveryPolicyUpdated | `RestaurantDeliveryDTO`, geo quotes |

---

## Out of scope (not event-contracted in v1.0)

- Order lifecycle events
- Payment events
- Checkout coupon events
- Analytics clickstream
- AI generation completion

---

*Events notify that domain truth changed. Contracts are rebuilt from domain — not patched ad hoc.*

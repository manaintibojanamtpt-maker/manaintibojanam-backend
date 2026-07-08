# 03 — Aggregate Boundaries

Domain-Driven Design aggregate boundaries and consistency rules.

---

## Aggregate map

| Aggregate | Root entity | Consistency boundary |
|---|---|---|
| **Restaurant** | `Restaurant` | Identity, brand, marketing, gallery, marketplace config, branch list |
| **Branch** | `Branch` | Sub-aggregate of Restaurant; location-specific ops (optional override) |
| **BusinessSchedule** | `BusinessSchedule` | All hours, closures, vacation — single writer |
| **DeliveryPolicy** | `DeliveryPolicy` | Zones, fees, prep defaults |
| **Category** | `Category` | Hierarchy, visibility, schedule for one category |
| **FoodProduct** | `FoodProduct` | Full product including variants (embedded) |
| **AddonGroup** | `AddonGroup` | Group + options; referenced by products |
| **Offer** | `Offer` | Schedule, scope, enabled state |

---

## Why FoodProduct is its own aggregate

- Products change frequently (price, availability) independent of restaurant profile
- Variant changes must not lock restaurant document
- Menu bulk operations (reorder, hide category) use domain events, not monolithic document writes
- Scales to large menus (500+ products)

**Variants are inside FoodProduct** — they share lifecycle and pricing context.

**Addons are outside** — reused across products; referenced by ID.

---

## Why Offer is its own aggregate

- Offers have independent schedules and enable/disable lifecycle
- Same offer engine serves restaurant, category, and product scopes
- Avoids duplicating offer blobs on every product document
- Product holds `productOfferId` reference OR resolves via offer query at projection time

---

## Consistency rules

### Within Restaurant aggregate

- `featuredProductIds` must reference existing active products
- `gallery` media assets must belong to restaurant's media library
- `defaultBranchId` must exist in `branches[]`
- Cannot publish marketplace listing without: brand.logo, ≥1 category, ≥1 active product, business schedule

### Within FoodProduct aggregate

- `categoryId` must reference existing visible category
- If `hasVariants`, sum of variant prices must be valid; exactly one `isDefault` variant
- `displayOrder` unique within category (domain service normalizes on save)
- Cannot set `visibility: visible` without hero media

### Within Category aggregate

- Cannot delete category with active products (must reassign or archive products first)
- Parent category cannot be self or descendant
- Scheduled category respects `CategorySchedule` independently of product visibility

### Within Offer aggregate

- `enabled: false` → projection emits nothing (mandatory)
- `schedule.end < now` → auto-disable via domain event
- Product-scoped offer must reference valid `foodProductId`
- Only one primary restaurant hero offer (highest `priority` among enabled restaurant-scoped)

### Cross-aggregate (eventual consistency)

| Action | Rule |
|---|---|
| Delete category | Emit `CategoryArchived` → products must be reassigned (sync or saga) |
| Disable restaurant | All products projection-hidden within 60s |
| Branch closure | Products with branch-specific availability update via event |
| Offer activated | Projection cache invalidated for affected products |

---

## Domain events (for future implementation)

| Event | Payload | Downstream |
|---|---|---|
| `RestaurantPublished` | restaurantId | Search index, marketplace |
| `ProductPriceChanged` | foodProductId, new pricing | Cart invalidation (future) |
| `ProductAvailabilityChanged` | foodProductId, status | Real-time menu refresh |
| `OfferEnabled` | offerId, scope | Projection rebuild |
| `OfferDisabled` | offerId | Remove from consumer views |
| `CategoryReordered` | restaurantId, categoryIds[] | Menu rail refresh |
| `ScheduleOverrideAdded` | scheduleId, date | Status engine recalc |

---

## Transaction boundaries (Firestore guidance — not implementation)

| Operation | Aggregates touched | Pattern |
|---|---|---|
| Save product with variants | FoodProduct only | Single document or subcollection |
| Create addon group | AddonGroup only | Independent write |
| Link addon to product | FoodProduct | Update reference array only |
| Publish restaurant | Restaurant + validation reads | Saga / validation service |
| Enable offer | Offer | Single write + projection invalidation |

---

## Anti-patterns (forbidden)

| Anti-pattern | Why |
|---|---|
| Monolithic `tenants/{id}` blob with entire menu embedded | No scalability, no product lifecycle |
| Global restaurant addons applied to all products | Violates product commerce model |
| Offer percentage stored only on product price delta | Renderer would compute text — Rule Zero violation |
| Open boolean without schedule aggregate | Cannot represent festivals, vacation, closing_soon |
| Consumer renderer writes back to domain | OrderBhojan is read-only |

---

## Aggregate ownership ACL

| Aggregate | Owner role | Platform admin |
|---|---|---|
| Restaurant | full CRUD (own) | suspend, feature |
| FoodProduct | full CRUD (own) | moderate (future) |
| Category | full CRUD (own) | — |
| Offer | full CRUD (own) | — |
| BusinessSchedule | full CRUD (own) | emergency override |
| DeliveryPolicy | full CRUD (own) | — |
| RatingSummary | read | system write |

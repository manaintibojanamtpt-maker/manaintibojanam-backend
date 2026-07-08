# 07 — Compatibility Guide

How clients, mappers, and renderers handle evolution, missing data, and unknown fields.

---

## Unknown field handling

### JSON deserialization (OrderBhojan client)

| Situation | Behavior |
|---|---|
| Unknown property in DTO | **Silently ignore** |
| Unknown `schemaVersion` MAJOR | **Reject** — show error state |
| Unknown `schemaVersion` MINOR | **Accept** — ignore unknown fields |
| Unknown enum value | **Treat as opaque** — hide specialized UI |
| Missing optional field | Use default: omit UI / empty array |

```typescript
// Client pseudocode
function parseFoodDTO(raw: unknown): FoodDTO {
  assertSchemaVersion(raw, supported: ['1.0']);
  return stripUnknownKeys(raw, FOOD_DTO_V1_KEYS);
}
```

### Mapper (Marketplace)

| Situation | Behavior |
|---|---|
| Domain field not yet mappable | **Omit** from DTO + log `[contract] unmapped: field` |
| Legacy domain field | Map via compat shim (see Migration Notes) |
| Invalid domain state | **Do not emit** entity; return validation error |

---

## Optional fields — default behavior

| Field absent | Renderer behavior |
|---|---|
| `offer` | No offer badge |
| `labels: []` | No label badges |
| `subtitle` | Omit subtitle line |
| `rating` | Hide rating |
| `pricing.sellingPrice` | Show regularPrice only |
| `pricing.mrp` | No MRP strike |
| `story` | Hide story panel |
| `variants: []` | Direct-add flow |
| `addonGroups: []` | No addon sections |
| `galleryPreview: []` | Hide gallery section |
| `primaryOffer` | No hero offer pill |
| `theme.cover` | Hero uses fallback surface color (not stock image) |
| `media.gallery: []` | Hero only |

**Never** substitute mock or stock content for absent fields.

---

## Deprecation rules

### Phase 1 — Annotated (mapper still emits)

```json
{
  "meta": {
    "deprecations": [{
      "field": "pricing.sellingPrice",
      "dtoVersion": "FoodDTO/1.0",
      "replacement": "offer.displayText + pricing",
      "sunsetDate": "2027-01-01"
    }]
  }
}
```

### Phase 2 — Sunset (field omitted)

Field removed from mapper output. Clients relying on deprecated field must have migrated.

### Phase 3 — Removed

Compat shim deleted. v1 clients on deprecated paths receive validation errors or empty substitutes.

---

## v1 boolean shim (transitional — PX6.1D only)

During migration from legacy `FoodPublic`:

| Legacy field | v1 contract equivalent | Shim duration |
|---|---|---|
| `bestSeller: true` | `labels: [{ kind: BESTSELLER, displayText: owner or default }]` | Until PX6.1G |
| `chefSpecial: true` | `labels: [{ kind: CHEF_PICK, ... }]` | Until PX6.1G |
| `offerPrice` | `pricing.sellingPrice` + separate `offer` | Until PX6.1G |
| `formatOfferLabel()` output | **NOT SHIMMED** — owner must set `offer.displayText` |

Shim emits **deprecated** warning in mapper logs. Renderer must consume v1 `LabelDTO`, not booleans.

---

## Client version negotiation

| Client Accept header | Server response |
|---|---|
| `version=1` (default) | v1.0 DTOs |
| `version=2` (future) | v2.0 DTOs |
| Unrecognized | `406 Not Acceptable` + MarketplaceErrorDTO |

OrderBhojan ships with `version=1` pinned until v2 migration epic.

---

## Partial menu / partial restaurant

When restaurant is `listed` but menu incomplete:

| Condition | Response |
|---|---|
| Zero categories | `FoodMenuDTO` with `categories: []`, `items: []` + warning meta |
| Zero items | Empty menu — valid contract |
| Some categories empty | Include category with `itemCount: 0` |

Renderer shows empty state — not mock dishes.

---

## Geo-dependent fields

`delivery.fee`, `delivery.etaMinutes`, `delivery.distanceKm` may be **absent** when client omits lat/lng.

| Absent field | Renderer |
|---|---|
| fee | Hide fee badge or show "Delivery fee at checkout" platform copy |
| eta | Hide ETA |
| distance | Hide distance |

Platform copy is **not** owner business data — acceptable in renderer chrome.

---

## Cache compatibility

| Cache key includes | Invalidate on |
|---|---|
| restaurantId + contractVersion | RestaurantUpdated, ThemeUpdated, OfferUpdated (restaurant scope) |
| restaurantId + menuVersion | FoodUpdated, CategoryUpdated, OfferUpdated (product scope) |
| geo hash + restaurantId | DeliveryPolicyUpdated |

`menuVersion` = hash of menu event sequence or updatedAt max.

---

## Testing compatibility

Contract compatibility tests (PX6.1G):

1. Deserialize golden JSON fixtures with extra unknown fields → no throw
2. Deserialize v1 fixture missing all optional fields → renderer stable
3. Unknown enum → graceful hide
4. schemaVersion 2.0 → client error path

---

## Breaking change checklist (before MAJOR bump)

- [ ] All v1 clients identified
- [ ] Parallel v1 mapper period defined (≥6 months)
- [ ] Migration notes updated
- [ ] Golden fixtures for v2
- [ ] OrderBhojan Accept header strategy approved
- [ ] Owner dashboard emits new domain fields

---

*Compatibility is intentional. Unknown fields are ignored — not guessed.*

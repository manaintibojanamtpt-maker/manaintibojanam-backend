# 09 — Migration Strategy

From current state (PX6 audit) to domain-frozen implementation phases.

---

## Current state summary

| Layer | Status |
|---|---|
| Product Domain | **This document set — pending approval** |
| Firestore | Legacy `tenants/` + `menu/` — partial owner fields |
| Marketplace API | MSW mocks invent consumer data |
| Owner Dashboard | Menu basics only |
| OrderBhojan | Certified renderer — fed by mocks |

---

## Implementation phases

```
PX6.1A  Product Domain Foundation     ← YOU ARE HERE (design freeze)
   ↓ approval
PX6.1B  Firestore Schema              collections per 05-FIRESTORE-PROJECTION
   ↓
PX6.1C  Owner Dashboard               screens per 07-OWNER-DASHBOARD-MAPPING
   ↓
PX6.1D  Marketplace DTO + Mappers     DTOs per 06-MARKETPLACE-PROJECTION
   ↓
PX6.1E  OrderBhojan Renderer          rules per 08-CONSUMER-MAPPING
   ↓
PX6.1F  Mock Removal                  MSW → test fixtures only
   ↓
PX6.1G  Synchronization Certification  Rule Zero verification
```

---

## PX6.1B — Firestore Schema

| Task | Deliverable |
|---|---|
| Create `restaurants/` collection schema | Migration from `tenants/` |
| Move `menu/` → `restaurants/{id}/products/` | Data migration script |
| Create subcollections: categories, offers, addonGroups, schedules, deliveryPolicies | |
| Media asset registry + Storage pipeline | |
| Security rules per 05 | |
| Indexes per query patterns | |

**Exit:** Owner writes persist to new schema (dual-write period optional).

---

## PX6.1C — Owner Dashboard

Priority order:

1. Category manager
2. Product editor (full tabs)
3. Addon group manager
4. Marketplace offers manager
5. Storefront (profile, brand, gallery, highlights)
6. Business hours expansion
7. Merchandising picker

**Exit:** Owner can configure every field in synchronization matrix without admin.

---

## PX6.1D — Marketplace DTO

| Task | Deliverable |
|---|---|
| Domain → DTO mappers | All DTOs in doc 06 |
| Offer resolution engine | Scope + schedule |
| Schedule → operational status engine | |
| Delivery → ETA/fee engine | |
| API routes wired to Firestore | Replace MSW per endpoint |
| Feature flags `FF_OB_FIRESTORE_*` | Default OFF |

**Compat shim:** Emit legacy `FoodPublic` booleans from `labels[]` during transition (deprecated).

---

## PX6.1E — OrderBhojan Renderer

| Task | Deliverable |
|---|---|
| Adopt `FoodDTO`, `RestaurantExperienceDTO` | Type migration |
| Remove `formatOfferLabel` | |
| Replace boolean badges with `LabelDTO` | |
| Remove photo manifest as business source | Pipeline uses `ImageDTO.url` |
| Remove `mockCatalog` home path | Discovery API only |
| Keep motion, a11y, layout unchanged | Certified surfaces frozen |

---

## PX6.1F — Mock Removal

| Artifact | Action |
|---|---|
| `foodExperienceMockLogic.ts` | Test fixtures only |
| `restaurantExperienceMockLogic.ts` | Test fixtures only |
| `mockCatalog.ts` | Delete or test-only |
| `COMMON_ADDONS` | Delete |
| Photo manifest business mapping | Delete; keep BlurHash util |
| MSW default handlers | Proxy to local API |

---

## PX6.1G — Synchronization Certification

| Test | Pass criteria |
|---|---|
| Rule Zero grep gate | Zero fabrication in consumer path |
| Owner → consumer E2E | 12 scenarios from PX6.1 audit success criteria |
| Performance | ≤ 1513 KB baseline + LCP budget |
| BDS certification | 100% maintained |
| Synchronization matrix | 100% fields mapped |

---

## Data migration (tenants → restaurants)

| Step | Action |
|---|---|
| 1 | Create `restaurantId` for each `tenants/{slug}` |
| 2 | Copy identity, brand, delivery, storeOperations → domain shape |
| 3 | Migrate `menu/` items → products with generated `labels[]` from legacy booleans |
| 4 | Generate categories from unique item.category strings |
| 5 | Mark migrated docs; keep slug index |
| 6 | Dual-read period: API tries new schema, falls back legacy with warning log |
| 7 | Cutover; archive legacy collections |

---

## Risk mitigation

| Risk | Mitigation |
|---|---|
| Owner portal downtime | Dual-write, feature flags |
| Breaking OrderBhojan certified UI | DTO shim; renderer changes only data binding |
| Large menu migration | Batch script; verify counts |
| Missing owner data post-migration | Graceful hide per fallback policy |

---

## Dependencies

| Phase | Depends on |
|---|---|
| 6.1B | 6.1A approval |
| 6.1C | 6.1B schema (can parallel partial UI with mocks) |
| 6.1D | 6.1B + 6.1C (needs real owner data) |
| 6.1E | 6.1D DTOs available (can start with MSW emitting new DTO shape) |
| 6.1F | 6.1E complete |
| 6.1G | 6.1F complete |

**Recommended parallel track:** After 6.1A approval, update MSW to emit new DTO shape (6.1E prep) while Owner work proceeds.

---

## Out of scope (all phases)

Checkout, payments, orders, tracking, notifications, loyalty program implementation, AI recommendations, coupon/checkout offer display merge.

---

## Approval gate

Domain design frozen when:

- [ ] Product team signs off aggregates 01
- [ ] Platform signs off Firestore projection 05
- [ ] API signs off DTO shapes 06
- [ ] Owner UX signs off dashboard mapping 07
- [ ] OrderBhojan signs off consumer mapping 08

**No implementation begins until sign-off.**

# PX6.1A — Product Domain Foundation

**Program:** BhojanOS Product Domain  
**Version:** 0.9.x-px61a  
**Status:** Domain design — **frozen pending approval**  
**Rule:** No code, Firestore, API, React, or BDS modifications

---

## Mission

Transform BhojanOS from **Menu Management** into **Restaurant Commerce Platform**.

Every customer-visible value originates in the domain. OrderBhojan renders only.

```
BhojanOS Domain Model
        ↓
Firestore Schema        (PX6.1B — not started)
        ↓
Marketplace API         (PX6.1D — not started)
        ↓
DTO Layer
        ↓
Owner Dashboard         (PX6.1C — not started)
        ↓
OrderBhojan Renderer    (PX6.1E — not started)
```

---

## Outputs

| # | Document | Scope |
|---|---|---|
| 01 | [Product Domain](./01-PRODUCT-DOMAIN.md) | Restaurant, Food Product, Category, Offer, Variant, Addon, Theme, Delivery, Business Hours |
| 02 | [Entity Relationship Model](./02-ENTITY-RELATIONSHIP-MODEL.md) | Entities, relationships, cardinality |
| 03 | [Aggregate Boundaries](./03-AGGREGATE-BOUNDARIES.md) | DDD aggregates, consistency rules |
| 04 | [Ownership Matrix](./04-OWNERSHIP-MATRIX.md) | Who owns what data |
| 05 | [Firestore Projection](./05-FIRESTORE-PROJECTION.md) | Collections derived from domain |
| 06 | [Marketplace Projection](./06-MARKETPLACE-PROJECTION.md) | Public DTOs — no implementation |
| 07 | [Owner Dashboard Mapping](./07-OWNER-DASHBOARD-MAPPING.md) | Every consumer field → owner screen |
| 08 | [Consumer Mapping](./08-CONSUMER-MAPPING.md) | OrderBhojan render rules |
| 09 | [Migration Strategy](./09-MIGRATION-STRATEGY.md) | PX6.1B–G phase plan |
| 10 | [Future Compatibility Review](./10-FUTURE-COMPATIBILITY-REVIEW.md) | Chain, franchise, loyalty, AI |

---

## Implementation phases (post-approval)

| Phase | Name | Scope |
|---|---|---|
| PX6.1B | Firestore Schema | Persist domain |
| PX6.1C | Owner Dashboard | Edit domain |
| PX6.1D | Marketplace DTO | Project domain |
| PX6.1E | OrderBhojan Renderer | Render DTOs |
| PX6.1F | Mock Removal | Remove fabrication |
| PX6.1G | Synchronization Certification | Rule Zero verification |

---

## Rule Zero

- Design **business domain first**
- Never invent consumer values in OrderBhojan
- If owner didn't configure it, it must not appear
- Offers render only when `offer.enabled === true`
- Labels render only from owner-selected `labels[]`

---

## Related

- [PX6.1 Audit](../px61/README.md) — hardcoded value inventory (pre-domain)

# PX6.1A.5 — Domain Contracts & Versioned DTO Specification

**Program:** PX6.1A.5  
**Status:** Contract freeze — pending approval  
**Prerequisite:** [PX6.1A Product Domain](../px61a/README.md) — domain frozen  
**Rule:** No Firestore, API, MSW, React, BDS, or Owner implementation

---

## Mission

Freeze every **public contract** before implementation. Downstream phases (6.1B–6.1G) must conform to these specifications exactly.

```
Domain → Contracts → Firestore → Marketplace API → DTO Mapper → OrderBhojan
```

---

## Outputs

| # | Document | Scope |
|---|---|---|
| 01 | [DTO Specification](./01-DTO-SPECIFICATION.md) | All v1 public DTOs |
| 02 | [Contract Rules](./02-CONTRACT-RULES.md) | Layer boundaries, prohibitions |
| 03 | [Versioning Strategy](./03-VERSIONING-STRATEGY.md) | schemaVersion, v2 evolution |
| 04 | [Ownership Matrix](./04-OWNERSHIP-MATRIX.md) | Per-property layer ownership |
| 05 | [Validation Rules](./05-VALIDATION-RULES.md) | Required, optional, constraints |
| 06 | [Event Contracts](./06-EVENT-CONTRACTS.md) | Future event payloads |
| 07 | [Compatibility Guide](./07-COMPATIBILITY-GUIDE.md) | Deprecation, unknown fields |
| 08 | [Migration Notes](./08-MIGRATION-NOTES.md) | Legacy types → v1 contracts |

---

## Contract catalog (v1.0)

| Contract | schemaVersion | Purpose |
|---|---|---|
| `RestaurantDTO` | `1.0` | Listing + experience envelope |
| `FoodDTO` | `1.0` | Menu product |
| `CategoryDTO` | `1.0` | Menu category |
| `OfferDTO` | `1.0` | Marketplace offer display |
| `VariantDTO` | `1.0` | Product size/portion |
| `AddonGroupDTO` | `1.0` | Addon selection group |
| `AddonOptionDTO` | `1.0` | Single addon choice |
| `ThemeDTO` | `1.0` | Brand visual tokens |
| `GalleryDTO` | `1.0` | Gallery item |
| `FoodMenuDTO` | `1.0` | Menu page envelope |
| `RestaurantExperienceDTO` | `1.0` | Restaurant page envelope |
| `ImageDTO` | `1.0` | Shared media reference |
| `MoneyDTO` | `1.0` | Shared monetary value |
| `MarketplaceErrorDTO` | `1.0` | Standard error envelope |

---

## Rule Zero (contracts)

| Layer | May define |
|---|---|
| **Domain** | Business rules, aggregates, invariants |
| **Contracts** | Immutable public field shapes + validation |
| **Firestore** | Persistence projection of domain |
| **Marketplace API** | HTTP transport + mapper to contracts |
| **OrderBhojan** | Render contract fields — never redefine them |

No layer may redefine another layer's data.

---

## Implementation order (post-approval)

```
PX6.1B  Firestore
PX6.1C  Owner Dashboard
PX6.1D  Marketplace API + DTO Mappers
PX6.1E  OrderBhojan Renderer
PX6.1F  Mock Removal
PX6.1G  Synchronization Certification
```

**STOP.** No implementation until contract approval.

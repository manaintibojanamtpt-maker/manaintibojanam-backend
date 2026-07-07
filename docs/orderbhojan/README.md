# OrderBhojan — Architecture Program (ARCHIVED DRAFT)

> **ARCHIVED — pre-implementation ARB planning pack (2026-07-03 draft).**  
> Do **not** use this folder for current milestone status.  
> **Canonical status:** [docs/PROGRAM-STATUS.md](../PROGRAM-STATUS.md) and `orderbhojan/docs/`.

**Product:** OrderBhojan — production marketplace platform  
**Repository:** `orderbhojan/` (initialized; M0–M6.5 complete on `main`)  
**Historical status when written:** M0 ARB Review — pre-scaffold planning

---

## Why this folder exists

These documents were written **before** the `orderbhojan/` app was scaffolded. They record architectural intent and ADR decisions. Implementation progressed independently under `orderbhojan/docs/` with exit reviews and gate scripts.

---

## Governance (still valid as architecture intent)

| Rule | Policy |
|------|--------|
| BhojanOS SSOT | Restaurant commerce data never duplicated |
| Frozen platforms | M1–M8 SDKs, GA-1/GA-2/GA-3 — do not modify without ADR |
| Founder Beta freeze | No new OrderBhojan milestones — see [.agents/AGENTS.md](../../.agents/AGENTS.md) |
| API surface | `/api/marketplace/*` only — never expose legacy APIs to customer app |

---

## Documents (historical reference)

| Document | Purpose |
|----------|---------|
| [M0-ARB-REVIEW.md](./M0-ARB-REVIEW.md) | Pre-implementation M0 gate draft (**superseded**) |
| [MARKETPLACE-API-v1.0.md](./MARKETPLACE-API-v1.0.md) | Public API contracts (opaque IDs) |
| [MILESTONES-M0-M12.md](./MILESTONES-M0-M12.md) | **Canonical** M0–M12 milestone sequence |
| [MILESTONES-M0-M13.md](./MILESTONES-M0-M13.md) | Alternate draft (superseded for sequencing) |
| [ARCHITECTURE-v1.0.md](./ARCHITECTURE-v1.0.md) | v1.0 reference |
| [FIRESTORE-CUSTOMER-SCHEMA-v1.0.md](./FIRESTORE-CUSTOMER-SCHEMA-v1.0.md) | Customer Firebase schema |
| [API-CONTRACTS-v1.0.md](./API-CONTRACTS-v1.0.md) | Legacy draft — aligned to `/api/marketplace/*`; prefer MARKETPLACE-API-v1.0 |

### ADRs

| ADR | Decision |
|-----|----------|
| [ADR-OB-001](./adr/ADR-OB-001-marketplace-boundary.md) | Marketplace boundary + additive API layer |
| [ADR-OB-002](./adr/ADR-OB-002-public-restaurant-identity.md) | Opaque restaurantId — hide tenant/branch |
| [ADR-OB-003](./adr/ADR-OB-003-search-provider-abstraction.md) | Backend search port for future Algolia/etc. |

---

## Current next step

See [docs/PROGRAM-STATUS.md](../PROGRAM-STATUS.md). OrderBhojan M7+ is **frozen** during Founder Beta. BhojanOS PMF work takes priority.

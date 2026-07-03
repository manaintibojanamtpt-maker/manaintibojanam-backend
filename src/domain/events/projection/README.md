# Projection Domain Layer

**Version:** `0.1.0-foundation` (`PROJECTION_DOMAIN_VERSION`)  
**Status:** M6 PR-4 — pure domain logic  
**Governance:** [PR-4 Report](../../docs/m6/PR-4-PROJECTION-WORKER-FOUNDATION-REPORT.md)

---

## Purpose

Generic projection worker domain — plans, checkpoints, batches, retry policy. No business projections (Order, Menu, Search, Discovery).

---

## Module Layout

| Path | Purpose |
|------|---------|
| `shared/` | Types, constants |
| `ProjectionPlan.ts` | Plan/batch/checkpoint builders |
| `ProjectionRetryPolicy.ts` | Retry and dead-letter policy |

---

## Constraints (M6 PR-4)

- **Pure domain** — no SDK, Firestore, React, network
- **Deterministic** — same inputs → same outputs
- **No business handlers** — infrastructure only

---

**STOP.** Await ARB approval before M6 PR-5.

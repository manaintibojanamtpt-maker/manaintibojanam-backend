# Branch Domain Layer

**Version:** `0.1.0-foundation` (`BRANCH_DOMAIN_VERSION`)  
**Status:** M5 PR-2 — pure domain logic  
**Governance:** [Branch Platform Law](../../docs/m5/BRANCH-PLATFORM-LAW.md)

---

## Architectural Law

- **Tenant = Brand** · **Branch = Fulfillment Unit**
- **Only BranchSDK** may choose branches (domain powers `BranchAssignmentEngine` in PR-2+)

---

## Module Layout

| Path | Purpose |
|------|---------|
| `assignment/` | Policy, reasons, metadata builders |
| `eligibility/` | Eligibility rules + validator |
| `scoring/` | Weights, calculator, breakdown |
| `validation/` | Query validation + best-branch selection |
| `operations/` | Operational availability intelligence (PR-10) |
| `shared/` | Types, constants, errors |

---

## Constraints (M5 PR-2)

- **Pure domain** — no SDK, Firestore, React, network
- **Deterministic** — same inputs → same outputs
- **No persistence** — metadata builders only
- **No assignment engine wiring** — arrives in SDK PR-4+

---

## Documentation

- [`docs/m5/PR-2-BRANCH-DOMAIN-FOUNDATION-REPORT.md`](../../docs/m5/PR-2-BRANCH-DOMAIN-FOUNDATION-REPORT.md)

---

**STOP.** Await ARB approval before M5 PR-3.

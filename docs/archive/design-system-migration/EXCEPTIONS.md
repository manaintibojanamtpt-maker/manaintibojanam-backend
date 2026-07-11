# BhojanOS Design System Migration — Approved Exceptions

**Version:** 1.0  
**Owner:** Chief Architect  
**Governed by:** [MIGRATION_GOVERNANCE.md](../MIGRATION_GOVERNANCE.md)

This file is the **only** authoritative list of CI-approved governance exceptions. Temporary workarounds not listed here **must fail** validation.

---

## How to request an exception

1. Copy the template below into a new `## EX-NNN` section.
2. Fill in all required fields.
3. Add a matching entry to the **Machine registry** JSON block at the bottom.
4. Obtain Chief Architect approval before merging.
5. Set an expiration date — exceptions are never permanent by default.

---

## Exception template

```markdown
## EX-NNN — Short title

| Field | Value |
|-------|-------|
| **Status** | active \| resolved \| expired |
| **Violation** | HARDCODED_COLOR \| BDS_IN_PRESENTATION \| DEEP_IMPORT \| … |
| **Scope** | path/glob (e.g. orderbhojan/src/presentation/food/**) |
| **Expires** | YYYY-MM-DD |
| **Approved** | YYYY-MM-DD — Chief Architect |

### Business justification

…

### Technical justification

…

### Risk assessment

…

### Rollback plan

…
```

---

## EX-001 — Phase 6 brand hex literals (OrderBhojan presentation)

| Field | Value |
|-------|-------|
| **Status** | active |
| **Violation** | HARDCODED_COLOR |
| **Scope** | orderbhojan/src/presentation/** |
| **Match** | `#030303`, `#0d0d0d`, `#ff7a00`, `#2a1a12`, `#f4c27a`, `#ffffff`, `#fff` |
| **Expires** | 2027-06-30 |
| **Approved** | 2026-07-10 — Chief Architect |

### Business justification

OrderBhojan marketplace dark canvas must match Founder Store visual identity during Phase 6 migration. Token migration to CSS variables is scheduled for Phase 7.

### Technical justification

Founder dark-theme tokens are not yet exported as Tailwind utilities for OrderBhojan presentation adapters. Hardcoded brand hex matches Founder Store `#030303` canvas and orange accent system.

### Risk assessment

**Low.** Colors are centralized to presentation layer only; no spread into business logic. Visual drift risk if Founder tokens change — mitigated by Phase 7 token unification.

### Rollback plan

Revert presentation files to prior milestone shims; restore BDS CSS classes from git history.

---

## EX-002 — OrderBhojan adapter subpath imports

| Field | Value |
|-------|-------|
| **Status** | active |
| **Violation** | DEEP_IMPORT |
| **Scope** | orderbhojan/src/** |
| **Match** | `@bhojan/storefront-design-system/adapters/**` |
| **Expires** | 2027-03-31 |
| **Approved** | 2026-07-10 — Chief Architect |

### Business justification

OrderBhojan requires marketplace adapter views that are intentionally exported under `adapters/marketplace/` until barrel exports are consolidated.

### Technical justification

Full `@bhojan/storefront-design-system` barrel pulls Founder app internals into OrderBhojan `tsc` graph. Subpath imports preserve tree-shaking and avoid circular deps.

### Risk assessment

**Low.** Paths are public adapter exports documented in ARCHITECTURE_FREEZE_v1.

### Rollback plan

Switch imports to consolidated barrel once adapter index exports are complete.

---

## EX-003 — FoodStoryPanel thin adapter (non–pure re-export)

| Field | Value |
|-------|-------|
| **Status** | active |
| **Violation** | SHIM_BLOATED |
| **Scope** | orderbhojan/src/features/food/ui/FoodStoryPanel.tsx |
| **Expires** | 2027-06-30 |
| **Approved** | 2026-07-10 — Chief Architect |

### Business justification

Legacy `FoodStoryPanel` API accepts `food: FoodPublic`; DS view accepts `story` view model. Shim must map props for backward compatibility.

### Technical justification

Pure re-export impossible without breaking callers. Adapter is 3 lines of mapping — not a second design system.

### Risk assessment

**Low.** Single file; listed in TECHNICAL_DEBT.md TD-7-08 area.

### Rollback plan

Restore inline BDS `Text` story panel from git.

---

## Resolved exceptions

_None yet._

---

## Machine registry (CI reads this block)

Do not edit manually without updating the human sections above.

```json
{
  "version": 1,
  "exceptions": [
    {
      "id": "EX-001",
      "violation": "HARDCODED_COLOR",
      "scope": "orderbhojan/src/presentation/",
      "match": "#030303|#0d0d0d|#ff7a00|#2a1a12|#f4c27a|#ffffff|#fff",
      "expires": "2027-06-30",
      "status": "active"
    },
    {
      "id": "EX-002",
      "violation": "DEEP_IMPORT",
      "scope": "orderbhojan/src/",
      "match": "storefront-design-system/adapters/",
      "expires": "2027-03-31",
      "status": "active"
    },
    {
      "id": "EX-003",
      "violation": "SHIM_BLOATED",
      "scope": "orderbhojan/src/features/food/ui/FoodStoryPanel.tsx",
      "match": "FoodStoryPanel",
      "expires": "2027-06-30",
      "status": "active"
    }
  ]
}
```

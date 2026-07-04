# M2 ARB Approval Package — Location Intelligence Platform

**Milestone:** M2  
**Package type:** Planning approval  
**Date:** 2026-06-26  
**Authority:** Architecture Review Board (Agent 02)

---

## Decision

**GO** — M2 Location Intelligence Platform planning package is **approved**.

**Implementation is NOT authorized** by this package. Engineering agents remain dormant until CEO issues separate implementation approval.

---

## Package Contents

| Document | Path | Status |
|----------|------|--------|
| Milestone spec | [MILESTONE.md](./MILESTONE.md) | Complete |
| Architecture report | [ARCHITECTURE-REPORT.md](./ARCHITECTURE-REPORT.md) | Complete |
| Design review | [DESIGN-REVIEW.md](./DESIGN-REVIEW.md) | Complete |
| Domain model | [DOMAIN-MODEL.md](./DOMAIN-MODEL.md) | Complete |
| API contracts (proposed) | [API-CONTRACTS-M2.md](./API-CONTRACTS-M2.md) | Reviewed |
| Risk assessment | [RISK-ASSESSMENT.md](./RISK-ASSESSMENT.md) | Complete |
| Rollout strategy | [ROLLOUT-STRATEGY.md](./ROLLOUT-STRATEGY.md) | Complete |
| Acceptance checklist | [ACCEPTANCE-CHECKLIST.md](./ACCEPTANCE-CHECKLIST.md) | Complete |
| Quality gates | [QUALITY-GATES.md](./QUALITY-GATES.md) | Complete |
| ADR | [ADR-OB-004](../adr/ADR-OB-004-location-intelligence-boundary.md) | Accepted |

---

## Architecture Summary

OrderBhojan M2 delivers a **client-side location module** that:

- Captures GPS permission and session location
- Saves India structured addresses to orderbhojan Firestore
- Proxies geocoding through proposed Marketplace API endpoints
- Integrates with M1.6 experience shell via location chip
- Does **not** implement discovery, cart, checkout, or BhojanOS changes

---

## Boundary Verification

| Rule | Verified |
|------|----------|
| One folder owner: `features/location/` → Agent 07 | ✓ |
| No OrderBhojan openapi.yaml changes in planning | ✓ |
| No OrderBhojan/BhojanOS source changes | ✓ |
| ADR-OB-001 compliant | ✓ |
| BDS-only UI | ✓ |
| Flags OFF default | ✓ |

---

## Planning Quality Gates

| Gate | Result |
|------|--------|
| Architecture review | **PASS** |
| API contracts reviewed | **PASS** |
| UX flow approved (DRB) | **PASS** |
| Risk assessment | **PASS** |
| Documentation | **PASS** |

---

## Implementation Activation Recipe (When Approved)

```
Executive: 00 CEO (implementation GO) → 01 PM
Review: 02 ARB (confirm scope unchanged)
Implementation:
  07 Location Platform (primary)
  05 OrderBhojan UI (header chip wiring only)
  08 Marketplace API (MSW handlers — if in scope)
  09 Firebase (rules review only — no change expected)
  12 Motion (sheet animations — if DRB requires)
Quality: 13 → 10 → 11 → 16
Cross-product: 19 Ecosystem Guardian
Platform: 14 → 17
```

**Do not activate** until CEO implementation GO.

---

## Conditions for Implementation GO

1. CEO explicit approval message
2. DRB confirms no BDS gaps block implementation
3. Version target confirmed: `0.4.0-m2`
4. Backend team acknowledges API contract proposal (MSW fallback acceptable)

---

## Sign-Off

| Role | Agent | Date | Signature |
|------|-------|------|-----------|
| CEO | 00 | 2026-06-26 | GO — planning authorized |
| Product Manager | 01 | 2026-06-26 | GO |
| ARB | 02 | 2026-06-26 | **GO — APPROVAL PACKAGE COMPLETE** |
| DRB | 03 | 2026-06-26 | GO — UX planning approved |
| Security | 16 | — | Consult at implementation |
| Release Manager | 17 | — | Awaiting implementation |

---

## STOP

**Planning complete. STOP.**

Do not write implementation code. Do not modify OrderBhojan or BhojanOS application source.

Await **implementation approval** before activating Agent 07 Location Platform.

Next milestone after M2 implementation (future): **M3 Discovery** — separate planning/approval.

---

*Executive AI Operating Board — M2 Location Intelligence Platform*

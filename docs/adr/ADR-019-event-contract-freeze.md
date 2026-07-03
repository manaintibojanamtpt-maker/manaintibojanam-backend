# ADR-019: Event Contract Freeze (M6 PR-4.5)

**Status:** Proposed  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A (first Event Platform governance freeze)  
**Related:** ADR-018 (Event Platform Foundation), ADR-013 (OrderSDK freeze pattern), M6 PR-1 through PR-4

---

## Context

M6 PR-1 through PR-4 delivered certified event platform infrastructure (604/604 tests):

- PR-1: Event Platform Foundation (`0.1.0-foundation`)
- PR-2: Event Infrastructure (`0.2.0-infrastructure`)
- PR-3: Outbox Persistence + Shadow Publishing (`0.3.0-persistence`)
- PR-4: Projection Worker Foundation (`0.4.0-projection`)

All feature flags default OFF. No business events exist in production.

Before M6 PR-5 publishes the first business event, the platform requires a **frozen governance contract** defining naming, versioning, compatibility, ownership, lifecycle, security, and observability.

M1–M5 platforms are certified and frozen. The Event Platform must establish equivalent contractual permanence for event names and schemas before any event is emitted.

---

## Decision

1. **Freeze** the Event Platform governance contract at **v1.0.0** effective 2026-06-26.

2. **Canonical documents** live at `docs/m6/v1/`:
   - `EVENT-CONTRACT.md` — master contract
   - `EVENT-CATALOG.md` — canonical registry
   - `EVENT-NAMING-STANDARD.md`
   - `EVENT-VERSIONING.md`
   - `EVENT-COMPATIBILITY.md`
   - `EVENT-SCHEMA-EVOLUTION.md`
   - `EVENT-OWNERSHIP-MATRIX.md`
   - `EVENT-LIFECYCLE.md`
   - `EVENT-DEPRECATION.md`
   - `EVENT-ROLLBACK.md`
   - `EVENT-REPLAY.md`
   - `EVENT-OBSERVABILITY.md`
   - `EVENT-SECURITY.md`
   - `EVENT-GOVERNANCE-CHECKLIST.md`

3. **Event naming is frozen** at pattern `<context>.<aggregate>.<action>.v<major>`.

4. **Event names are immutable** once Published. Breaking changes require new event major.

5. **All future events** MUST be registered in `EVENT-CATALOG.md` before implementation.

6. **No runtime changes** in this PR — documentation and governance only.

7. **Explicit exclusions:**
   - Business event implementations (PR-5+)
   - SDK code changes
   - Firestore migrations
   - Presentation changes
   - M1–M5 frozen SDK modifications

---

## Consequences

### Positive

- First business event (PR-5) has clear governance guardrails
- Event names become permanent platform contracts
- ARB has checklists for every review gate
- Compatibility rules prevent uncontrolled schema drift
- Rollback and replay policies defined before production use

### Negative / deferred

- Governance docs require maintenance as new platforms emerge
- Proposed events in catalog are not yet Approved/Published
- Schema Registry history versioning deferred to PR-6+
- Automated governance enforcement (CI lint) deferred to PR-6+

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Freeze EventSDK code as v1.0.0 | Infrastructure still evolving; governance freeze is sufficient pre-PR-5 |
| Defer governance until first business event | First event would set precedent without standards |
| Embed governance in code comments | Not discoverable; not ARB-reviewable |
| Single monolithic governance doc | Unmaintainable; split by concern is clearer |

---

## Compliance

Future changes to frozen governance require:

- **Patch:** Typo/clarification only
- **Minor:** Additive rules (new namespace, new checklist item)
- **Major:** Breaking governance change — new ADR + ARB approval

Event names once Published are governed by [EVENT-DEPRECATION.md](../m6/v1/EVENT-DEPRECATION.md), not by modifying this ADR.

---

## References

- `docs/m6/v1/EVENT-CONTRACT.md`
- `docs/m6/v1/EVENT-CATALOG.md`
- [ADR-018](./ADR-018-event-platform.md)
- M6 PR-4 Projection Worker Foundation Report

---

*ADR-019 — Event Contract Freeze v1.0.0.*

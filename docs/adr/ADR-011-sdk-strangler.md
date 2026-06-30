# ADR-011: SDK-First UI via Strangler Pattern

**Status:** Accepted  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board, Founder  
**Milestone:** Documented in M0 PR-0; **implementation deferred** to M1+

---

## Context

BHOS-000 (Platform Manifest) and BHOS-PAF-001 establish **SDK-first** as law:

- Presentation layer must not access Firestore directly for domain operations.
- Business logic lives in domain services; UI consumes `@bhojanos/sdk` (or equivalent package).
- API-first, event-first, tenant/branch-native contracts apply at the SDK boundary.

**AS-IS:** The production BhojanOS app is a React SPA that writes and reads Firestore directly via `src/services/api.ts` (~monolithic data layer). Express `server.ts` handles payments, cron, and notifications. This hybrid predates the constitution.

**Problem:** A big-bang rewrite to SDK-only would block M0 security work and risk production outages. ERR-001 rates composite readiness at 41%; full roadmap is No-Go.

**Constraint:** Architecture is frozen. We cannot abandon SDK-first as the target state. We need a migration path that is backward compatible, reversible, and feature-flag driven.

---

## Decision

Adopt the **Strangler Fig pattern** for SDK migration:

1. **Freeze new Firestore-direct domain logic** in Presentation — new features route through server API or SDK stubs.
2. **Introduce `packages/sdk` (or `src/sdk/`) incrementally** per domain module (orders, menu, tenants, …), one PR per bounded context.
3. **Wrap existing `src/services/api.ts` functions** behind SDK facades; UI imports switch module-by-module behind feature flags.
4. **Do not delete** Firestore-direct paths until SDK path has parity tests and production soak.
5. **M0 is exempt** from SDK implementation — M0 closes security gaps on the existing hybrid stack only.

### Strangler phases (post-M0, requires ERR-002)

| Phase | Scope | Gate |
|-------|-------|------|
| S1 | SDK package scaffold + order read models | ERR-002 ≥ 70% |
| S2 | Order write path via API (optional) | M1 order FSM |
| S3 | Menu, tenant, owner modules | M2+ |
| S4 | Remove direct Firestore from `src/services/api.ts` | Per-module ADR + 30d soak |

### What stays direct temporarily

- Firestore realtime listeners for owner kitchen board (until event bus parity)
- Client order creation (`createOrder`) until M1 unified FSM
- Existing authenticated flows protected by Firestore rules

---

## Consequences

### Positive

- M0 can ship without blocking on SDK rewrite.
- Clear, reviewable migration units (one domain per PR).
- Feature flags allow instant rollback per module.
- Aligns long-term with BHOS-000 without violating freeze.

### Negative

- Dual paths (Firestore-direct + SDK) increase maintenance during strangler window.
- Engineers must read ADR-011 before adding data access code.
- SDK package does not exist yet — discipline required to avoid new violations.

### Neutral

- `server.ts` remains authoritative for payment truth regardless of SDK phase.

---

## Compliance rules (effective immediately)

| Rule | Enforcement |
|------|-------------|
| No new `collection('orders')` writes in React components | Code review |
| New API routes follow `verifyFirebaseToken` + domain access helpers | M0+ |
| SDK migration PRs reference this ADR | PR template |
| Changing SDK public contracts requires new ADR | Architecture guardrail |

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Big-bang SDK rewrite before M0 | Blocks CB-1; high outage risk |
| Permanently allow Firestore-direct UI | Violates BHOS-000; no tenant/branch safety at scale |
| Server-only BFF for all reads now | Doubles latency/cost; doesn't match realtime kitchen needs |

---

## References

- BHOS-000 Platform Manifest — SDK-first principle
- BHOS-PAF-001 — Layered architecture
- BHOS-ERR-001 — Readiness 41%; M0 only
- FEB-001 — Q1 scope: M0 security
- `docs/specs/M0-security.md` — M0 does not implement this ADR

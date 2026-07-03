# Event Governance Checklist — BhojanOS M6 v1

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**ADR:** [ADR-019](../../adr/ADR-019-event-contract-freeze.md)

---

## 1. Purpose

Mandatory checklists for Architecture Review Board (ARB) approval of events, projections, schemas, compatibility changes, and releases.

---

## 2. Event Review Checklist

Complete before transitioning event from **Draft → Approved**.

| # | Item | Owner | ✓ |
|---|------|-------|---|
| 1 | Event name follows `<context>.<aggregate>.<action>.v<major>` | Platform owner | ☐ |
| 2 | Namespace ownership verified against reserved namespaces | Platform owner | ☐ |
| 3 | No cross-platform domain logic implied | Platform owner | ☐ |
| 4 | Entry added to [EVENT-CATALOG.md](./EVENT-CATALOG.md) | Platform owner | ☐ |
| 5 | Entry added to [EVENT-OWNERSHIP-MATRIX.md](./EVENT-OWNERSHIP-MATRIX.md) | Platform owner | ☐ |
| 6 | PII classification assigned (none/internal/sensitive/restricted) | Platform owner | ☐ |
| 7 | Retention period defined | Platform owner | ☐ |
| 8 | Replay supported flag set | Platform owner | ☐ |
| 9 | Producer and all consumers identified | Platform owner | ☐ |
| 10 | Compatibility policy declared (backward/forward/full) | Platform owner | ☐ |
| 11 | No restricted-class PII in payload design | Security | ☐ |
| 12 | correlationId propagation documented | Platform owner | ☐ |
| 13 | ARB approval recorded | ARB | ☐ |

---

## 3. Projection Review Checklist

Complete before registering a new `ProjectionIdentity`.

| # | Item | Owner | ✓ |
|---|------|-------|---|
| 1 | `projectionName` follows platform naming convention | Platform owner | ☐ |
| 2 | `projectionVersion` semver assigned | Platform owner | ☐ |
| 3 | `consumerGroup` unique and documented | Platform owner | ☐ |
| 4 | `ownerPlatform` matches event namespace owner | Platform owner | ☐ |
| 5 | `replaySupported` flag set correctly | Platform owner | ☐ |
| 6 | `checkpointStrategy` declared (event_id / sequence) | Platform owner | ☐ |
| 7 | Supported event types and majors listed | Platform owner | ☐ |
| 8 | Handler tolerates unknown payload fields (forward compatible) | Developer | ☐ |
| 9 | No domain logic from other platforms (LAW 4) | ARB | ☐ |
| 10 | Duplicate identity check passes | Developer | ☐ |
| 11 | Read model schema documented | Platform owner | ☐ |
| 12 | Rebuild plan documented (if replaySupported) | Platform owner | ☐ |
| 13 | Telemetry hooks verified | Developer | ☐ |
| 14 | ARB approval for cross-platform consumption | ARB | ☐ |

---

## 4. Schema Review Checklist

Complete before schema registry update.

| # | Item | Owner | ✓ |
|---|------|-------|---|
| 1 | JSON Schema Draft 2020-12 or compatible | Developer | ☐ |
| 2 | All required fields documented with types | Developer | ☐ |
| 3 | Optional fields have defaults or are truly optional | Developer | ☐ |
| 4 | Enum values documented | Developer | ☐ |
| 5 | Change classified: major / minor / patch | Developer | ☐ |
| 6 | Compatibility impact assessed per [EVENT-COMPATIBILITY.md](./EVENT-COMPATIBILITY.md) | Developer | ☐ |
| 7 | Unknown field policy: consumers ignore unknown | Developer | ☐ |
| 8 | Deprecated fields annotated with dates | Developer | ☐ |
| 9 | Changelog entry written | Developer | ☐ |
| 10 | No breaking change without new event major | ARB | ☐ |
| 11 | Schema validated against sample payloads | Developer | ☐ |
| 12 | PII fields classified per [EVENT-SECURITY.md](./EVENT-SECURITY.md) | Security | ☐ |

---

## 5. Compatibility Review Checklist

Complete before any schema or event major change.

| # | Item | Owner | ✓ |
|---|------|-------|---|
| 1 | Backward compatibility assessed | Developer | ☐ |
| 2 | Forward compatibility assessed | Developer | ☐ |
| 3 | All registered consumers identified | Platform owner | ☐ |
| 4 | Consumer migration plan documented (if breaking) | Platform owner | ☐ |
| 5 | Dual-publish period defined (if breaking) | Platform owner | ☐ |
| 6 | Deprecation timeline per [EVENT-DEPRECATION.md](./EVENT-DEPRECATION.md) | Platform owner | ☐ |
| 7 | Rollback plan per [EVENT-ROLLBACK.md](./EVENT-ROLLBACK.md) | Platform owner | ☐ |
| 8 | Replay compatibility verified (if replaySupported) | Developer | ☐ |
| 9 | Version negotiation behavior documented | Developer | ☐ |
| 10 | ARB approval for breaking changes | ARB | ☐ |

---

## 6. Release Review Checklist

Complete before enabling feature flags for event emission (PR-5+).

| # | Item | Owner | ✓ |
|---|------|-------|---|
| 1 | All events Approved in catalog | Platform owner | ☐ |
| 2 | All schemas registered | Developer | ☐ |
| 3 | All projections registered with unique identity | Developer | ☐ |
| 4 | Feature flag plan documented (which flags, which env) | Platform owner | ☐ |
| 5 | Shadow publish successful in staging | Developer | ☐ |
| 6 | DLQ monitoring configured | M6 team | ☐ |
| 7 | Telemetry dashboards configured | M6 team | ☐ |
| 8 | Rollback plan tested (flag OFF → legacy path works) | Developer | ☐ |
| 9 | `npm run test:sdk` passing (604/604 baseline) | Developer | ☐ |
| 10 | No M1–M5 frozen SDK changes | ARB | ☐ |
| 11 | No presentation layer changes | ARB | ☐ |
| 12 | Staging soak period defined (≥ 72 hours) | Platform owner | ☐ |
| 13 | ARB Go/No-Go decision recorded | ARB | ☐ |

---

## 7. Platform Freeze Certification Checklist (PR-4.5)

| # | Gate | Status |
|---|------|--------|
| 1 | No code changes in PR-4.5 | ✅ |
| 2 | No runtime behaviour changes | ✅ |
| 3 | No Firestore changes | ✅ |
| 4 | No SDK contract changes (M1–M5) | ✅ |
| 5 | No presentation changes | ✅ |
| 6 | No API changes | ✅ |
| 7 | EVENT-CONTRACT.md published | ✅ |
| 8 | EVENT-CATALOG.md v1 published | ✅ |
| 9 | All 14 governance documents in docs/m6/v1/ | ✅ |
| 10 | ADR-019 through ADR-022 published | ✅ |
| 11 | 604/604 tests still passing (unchanged) | ✅ |
| 12 | ARB ratification pending | ☐ |

---

## 8. References

- [EVENT-CONTRACT.md](./EVENT-CONTRACT.md)
- [EVENT-LIFECYCLE.md](./EVENT-LIFECYCLE.md)
- [EVENT-COMPATIBILITY.md](./EVENT-COMPATIBILITY.md)
- [EVENT-SECURITY.md](./EVENT-SECURITY.md)

---

*Event Governance Checklist v1.0.0 — frozen 2026-06-26.*

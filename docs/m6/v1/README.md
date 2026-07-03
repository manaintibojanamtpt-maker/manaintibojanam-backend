# M6 Event Platform — v1 Governance (Frozen Contract)

**Program:** BHOS-M6-A  
**PR:** M6 PR-4.5 — Event Governance & Platform Freeze  
**Status:** Frozen — awaiting ARB ratification  
**Date:** 2026-06-26  
**Baseline:** M6 PR-1 through PR-4 complete (604/604 tests)

---

## Purpose

This directory is the **permanent enterprise contract** for BhojanOS events. It defines HOW events are governed — not how they are processed. No runtime code lives here.

Before the first business event is published (M6 PR-5+), every platform MUST comply with these documents.

---

## Document Index

| Document | Purpose |
|----------|---------|
| [EVENT-CONTRACT.md](./EVENT-CONTRACT.md) | Master contract — envelope, obligations, freeze scope |
| [EVENT-CATALOG.md](./EVENT-CATALOG.md) | Canonical event registry |
| [EVENT-NAMING-STANDARD.md](./EVENT-NAMING-STANDARD.md) | Naming rules and reserved namespaces |
| [EVENT-VERSIONING.md](./EVENT-VERSIONING.md) | Major/minor/patch semantics |
| [EVENT-COMPATIBILITY.md](./EVENT-COMPATIBILITY.md) | Backward/forward compatibility rules |
| [EVENT-SCHEMA-EVOLUTION.md](./EVENT-SCHEMA-EVOLUTION.md) | Payload evolution and field policies |
| [EVENT-OWNERSHIP-MATRIX.md](./EVENT-OWNERSHIP-MATRIX.md) | Owner, producer, consumer obligations |
| [EVENT-LIFECYCLE.md](./EVENT-LIFECYCLE.md) | Draft → Approved → Published → Deprecated → Retired |
| [EVENT-DEPRECATION.md](./EVENT-DEPRECATION.md) | Deprecation and retirement policy |
| [EVENT-ROLLBACK.md](./EVENT-ROLLBACK.md) | Rollback and incident response |
| [EVENT-REPLAY.md](./EVENT-REPLAY.md) | Replay authorization and checkpoint rules |
| [EVENT-OBSERVABILITY.md](./EVENT-OBSERVABILITY.md) | Correlation, causation, trace, telemetry |
| [EVENT-SECURITY.md](./EVENT-SECURITY.md) | PII, encryption, audit, retention |
| [EVENT-GOVERNANCE-CHECKLIST.md](./EVENT-GOVERNANCE-CHECKLIST.md) | Review checklists for ARB |

---

## Related ADRs

| ADR | Title |
|-----|-------|
| [ADR-019](../../adr/ADR-019-event-contract-freeze.md) | Event Contract Freeze |
| [ADR-020](../../adr/ADR-020-projection-identity-freeze.md) | Projection Identity Freeze |
| [ADR-021](../../adr/ADR-021-event-versioning-policy.md) | Event Versioning Policy |
| [ADR-022](../../adr/ADR-022-schema-evolution-policy.md) | Schema Evolution Policy |

---

## Architectural Law

```
Commands → Domain → Events (Outbox) → Projection Workers → Read Models → Frozen SDKs → Presentation
```

M1–M5 frozen SDKs are **not modified** by governance documents.

---

**STOP.** Do not publish business events until ARB approves M6 PR-5.

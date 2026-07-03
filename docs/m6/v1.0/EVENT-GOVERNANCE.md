# Event Platform Governance v1.0

**Status:** Frozen — M6 PR-14  
**Date:** 2026-06-27  
**Governance:** ADR-018 · ADR-019–022 · ADR-024 · FEB-001

---

## 1. Ownership

| Role | Responsibility |
|------|----------------|
| **Platform Architect** | ADR approval, freeze decisions |
| **Event SDK Owner** | EventSDK contract stability |
| **Domain Owner** | Event envelope, projection rules |
| **SRE / Ops** | Rollout, observability, rollback |
| **ARB** | Production activation approval |

---

## 2. Change control

### Frozen (require ADR + ARB)

- `EventSDK` public contract (5 methods)
- `EventEnvelope` and core DTOs
- Event naming pattern (ADR-019)
- Feature flag names and defaults
- Version constants (post PR-14)
- OrderSDK read API (ADR-013) — no changes via Event Platform

### Additive only (PR review)

- New telemetry events
- New event types in catalog (with ADR-019 registration)
- Documentation updates
- Test additions

### Prohibited without explicit ADR

- Wiring adapter into OrderSDK
- Changing flag defaults to ON
- Modifying frozen platforms (M1–M5, M7)
- Breaking EventEnvelope changes
- Production routing changes

---

## 3. Version policy

| Version | Meaning |
|---------|---------|
| `0.x.x` | Pre-release infrastructure PRs |
| `1.0.0` | First certified freeze (PR-14) |
| `1.x.x` | Additive patches post-freeze |
| `2.0.0` | Breaking contract change |

---

## 4. Dual governance layers

| Layer | Location | Scope |
|-------|----------|-------|
| **Event contract governance** | `docs/m6/v1/` | Naming, schemas, lifecycle |
| **Platform certification** | `docs/m6/v1.0/` | SDK freeze, rollout, rollback |

Both layers required for production activation.

---

## 5. Certification governance

| Decision | Authority |
|----------|-----------|
| Metadata freeze | ARB (ADR-024) |
| Staging soak | Platform team |
| Production activation | ARB + explicit approval |
| Emergency rollback | SRE (L1–L4) |

---

## 6. Related documents

- [EVENT-PLATFORM-CERTIFICATION.md](./EVENT-PLATFORM-CERTIFICATION.md)
- [docs/m6/v1/EVENT-GOVERNANCE-CHECKLIST.md](../v1/EVENT-GOVERNANCE-CHECKLIST.md)
- [docs/adr/ADR-024-event-platform-v1-freeze.md](../../adr/ADR-024-event-platform-v1-freeze.md)

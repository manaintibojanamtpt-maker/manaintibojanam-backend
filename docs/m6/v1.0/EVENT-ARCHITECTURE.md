# Event Platform Architecture v1.0

**Status:** Frozen — M6 PR-14  
**Date:** 2026-06-27

---

## 1. Architecture overview

```
Commands → Domain → Events (Outbox) → Projection → Read Models → Frozen SDKs → Presentation
```

```
┌─────────────────────────────────────────────────────────┐
│                    EventSDK (PR-1)                       │
│         publish · subscribe · schema · replay            │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Infrastructure (PR-2, PR-3)                 │
│    Outbox · Idempotency · DLQ · Shadow Publishing        │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│           Projection Worker + Runtime (PR-4, PR-6)       │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│         Order Shadow Events + Projection (PR-5, PR-7)    │
└─────────────────────────────────────────────────────────┘

Standalone (NOT wired to OrderSDK):
  Parity (PR-8) → Soak (PR-9) → Operational (PR-10)
  → Adapter (PR-11) → Rollout (PR-12) → Certification (PR-13)
```

---

## 2. Layer responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Domain** | `src/domain/events/` | Pure event, projection, parity, operations rules |
| **SDK** | `src/sdk/events/` | EventSDK, infrastructure, projection workers |
| **Order projection infra** | `src/sdk/order/` | Adapter, rollout, certification (standalone) |
| **Frozen read SDKs** | M1–M5, OrderSDK | Consumers only — not modified |

---

## 3. M6 PR map

| PR | Deliverable |
|----|-------------|
| PR-1 | EventSDK foundation |
| PR-2 | Infrastructure adapters |
| PR-3 | Outbox persistence |
| PR-4 | Projection worker |
| PR-4.5 | Governance docs (ADR-019–022) |
| PR-5 | Order shadow events |
| PR-6 | Projection runtime |
| PR-7 | Order read projection |
| PR-8 | Parity validation |
| PR-9 | Soak certification |
| PR-10 | Operational validation |
| PR-11 | Order read adapter |
| PR-12 | Staged rollout |
| PR-13 | Switch certification |
| PR-14 | Metadata promotion + v1.0 doc pack |

---

## 4. Feature flag architecture

14 flags across EventSDK core (11) + order infrastructure (3). All default **OFF**.

---

## 5. Architecture compliance

| Principle | Status |
|-----------|--------|
| Provider neutrality | ✅ Port abstractions |
| Strangler pattern | ✅ Shadow projection + adapter |
| Feature flag gating | ✅ All OFF |
| Legacy authoritative | ✅ Order reads |
| No cross-platform coupling | ✅ M1–M5, M7 untouched |
| Domain purity | ✅ No I/O in domain |
| EventEnvelope only | ✅ ADR-019 |

---

## 6. Related ADRs

- ADR-018 — Event Platform Foundation
- ADR-019–022 — Event governance bundle
- ADR-024 — Event Platform v1.0 freeze

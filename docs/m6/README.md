# M6 — OS Spine Implementation

**Status:** M6 PR-14 complete — Event Platform v1.0 **FROZEN**  
**Blueprint:** [OS-SPINE-ARCHITECTURE.md](./OS-SPINE-ARCHITECTURE.md)  
**Certification:** [v1.0 Documentation Pack](./v1.0/EVENT-PLATFORM-CERTIFICATION.md) · **CONDITIONAL GO**  
**ADR:** [ADR-024](../adr/ADR-024-event-platform-v1-freeze.md) (accepted)  
**Runtime:** `EVENT_SDK_VERSION = 1.0.0` · `EVENT_SDK_FROZEN = true` · tag `event-platform-v1.0` (pending)

---

## Program Index

| PR | Platform | Status | ADR |
|----|----------|--------|-----|
| PR-1 | Event Platform Foundation | ✅ Complete | [ADR-018](../adr/ADR-018-event-platform.md) |
| PR-2 | Event Platform Infrastructure | ✅ Complete | ADR-018 (additive) |
| PR-3 | Outbox Persistence + Shadow Publishing | ✅ Complete | ADR-018 (additive) |
| PR-4 | Projection Worker Foundation | ✅ Complete | ADR-018 (additive) |
| PR-4.5 | Event Governance & Platform Freeze | ✅ Complete | [ADR-019](../adr/ADR-019-event-contract-freeze.md) – ADR-022 |
| PR-5 | First Business Event Shadow Publishing | ✅ Complete | ADR-019 (shadow) |
| PR-6 | Projection Runtime & Persistence | ✅ Complete | ADR-019 (additive) |
| PR-7 | First Order Read Projection | ✅ Complete | ADR-019 (shadow) |
| PR-8 | Order Projection Parity Validation | ✅ Complete | ADR-019 (validation) |
| PR-9 | Projection Parity Soak & Certification | ✅ Complete | ADR-019 (certification) |
| PR-10 | Staging Operational Validation | ✅ Complete | ADR-019 (operations) |
| PR-11 | Order Read Adapter Layer | ✅ Complete | ADR-019 (adapter) |
| PR-12 | Controlled Projection Read Rollout | ✅ Complete | ADR-019 (rollout) |
| PR-13 | Projection Read Switch Certification | ✅ Complete | ADR-019 (certification) |
| PR-14 | Event Platform Metadata Promotion | ✅ Complete — v1.0 frozen |

---

## v1.0 Documentation Pack

| Document | Purpose |
|----------|---------|
| [EVENT-PLATFORM-CERTIFICATION.md](./v1.0/EVENT-PLATFORM-CERTIFICATION.md) | Certification report & verdict |
| [EVENT-PUBLIC-API-v1.md](./v1.0/EVENT-PUBLIC-API-v1.md) | Frozen public API |
| [EVENT-COMPATIBILITY-MATRIX.md](./v1.0/EVENT-COMPATIBILITY-MATRIX.md) | Flag combinations & enable sequence |
| [EVENT-TEST-MATRIX.md](./v1.0/EVENT-TEST-MATRIX.md) | Test coverage (1033/1033) |
| [EVENT-PERFORMANCE-REPORT.md](./v1.0/EVENT-PERFORMANCE-REPORT.md) | Performance posture |
| [EVENT-OBSERVABILITY.md](./v1.0/EVENT-OBSERVABILITY.md) | Telemetry & monitoring |
| [EVENT-ROLLBACK.md](./v1.0/EVENT-ROLLBACK.md) | L1–L4 rollback procedures |
| [EVENT-RELEASE-NOTES-v1.md](./v1.0/EVENT-RELEASE-NOTES-v1.md) | Release notes |
| [EVENT-GOVERNANCE.md](./v1.0/EVENT-GOVERNANCE.md) | Change control |
| [EVENT-ARCHITECTURE.md](./v1.0/EVENT-ARCHITECTURE.md) | Architecture reference |
| [EVENT-MIGRATION-ROADMAP.md](./v1.0/EVENT-MIGRATION-ROADMAP.md) | Migration phases |
| [EVENT-QUALITY-GATES.md](./v1.0/EVENT-QUALITY-GATES.md) | Quality gates (16/16) |
| [EVENT-RISK-ASSESSMENT.md](./v1.0/EVENT-RISK-ASSESSMENT.md) | Risk matrix |
| [EVENT-CHANGELOG-v1.md](./v1.0/EVENT-CHANGELOG-v1.md) | Changelog |

**Governance contract pack:** [docs/m6/v1/](./v1/) (ADR-019–022)

**Runtime version:** `EVENT_SDK_VERSION = 1.0.0` · `EVENT_SDK_FROZEN = true`  
**Git tag:** `event-platform-v1.0` (prepare after merge — see [event-platform-v1.0.md](../releases/event-platform-v1.0.md))

---

## M6 PR-14 Deliverables

- **Version:** `src/sdk/events/version.ts` — `1.0.0`, `EVENT_SDK_FROZEN = true`
- **ADR:** [ADR-024-event-platform-v1-freeze.md](../adr/ADR-024-event-platform-v1-freeze.md) (Accepted)
- **Documentation:** Full v1.0 pack (14 documents) in `docs/m6/v1.0/`
- **Release notes:** [event-platform-v1.0.md](../releases/event-platform-v1.0.md)
- **Tests:** Version assertion updates; 1033/1033 pass
- **No behaviour changes.** No contract changes. No feature flag changes.

---

## M6 PR-13 Deliverables

- **Certification:** `src/sdk/order/certification/` — evaluator, evidence, report, telemetry, factory
- **Domain:** `src/domain/order/certification/` — readiness rules, status, evidence, thresholds, metadata
- **Flag:** `FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` (default OFF; certification only — no production switch)
- **Tests:** `projectionSwitchCertification.test.ts` (8), `projectionCertificationDomain.test.ts` (8)
- **Report:** [PR-13-PROJECTION-SWITCH-CERTIFICATION-REPORT.md](./PR-13-PROJECTION-SWITCH-CERTIFICATION-REPORT.md)

---

## M6 PR-12 Deliverables

- **Rollout:** `src/sdk/order/rollout/` — policy, strategy, evaluator, metrics, telemetry, factory
- **Domain:** `src/domain/order/rollout/` — decision, stage, thresholds, health, policy, metadata
- **Flag:** `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` (default OFF; not wired to adapter or OrderSDK)
- **Tests:** `projectionRollout.test.ts` (9), `rolloutDomain.test.ts` (12)
- **Report:** [PR-12-PROJECTION-READ-ROLLOUT-REPORT.md](./PR-12-PROJECTION-READ-ROLLOUT-REPORT.md)

---

## M6 PR-11 Deliverables

- **Adapter:** `src/sdk/order/adapter/` — read adapter, legacy/projection adapters, factory, telemetry, validation
- **Domain:** `src/domain/order/adapter/` — decision, rules, source, metadata
- **Flag:** `FF_ORDER_PROJECTION_ADAPTER_ENABLED` (default OFF; requires parity READY + operational GREEN + projection repo)
- **Tests:** `orderReadAdapter.test.ts` (9), `orderAdapterDomain.test.ts` (7)
- **Report:** [PR-11-ORDER-READ-ADAPTER-REPORT.md](./PR-11-ORDER-READ-ADAPTER-REPORT.md)

---

## M6 PR-10 Deliverables

- **Operations:** `src/sdk/events/operations/` — validator, lag analyzer, health monitor, drift detector, replay validator, telemetry, factory
- **Domain:** `src/domain/events/operations/` — lag, drift, health, replay, rules, thresholds
- **Flag:** `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED` (default OFF; requires all seven event/projection flags)
- **Tests:** `eventSdkProjectionOperational.test.ts` (11), `projectionOperationsDomain.test.ts` (11)
- **Report:** [PR-10-STAGING-OPERATIONAL-VALIDATION-REPORT.md](./PR-10-STAGING-OPERATIONAL-VALIDATION-REPORT.md)

---

## M6 PR-9 Deliverables

- **Soak:** `src/sdk/events/parity/soak/` — runner, analyzer, metrics, certification, telemetry, factory
- **Domain:** `src/domain/events/parity/soak/` — thresholds, health, readiness, trend, certification rules
- **Flag:** `FF_ORDER_PROJECTION_SOAK_ENABLED` (default OFF; requires all six event/projection flags)
- **Tests:** `eventSdkProjectionParitySoak.test.ts` (11), `paritySoakDomain.test.ts` (11)
- **Report:** [PR-9-PROJECTION-PARITY-SOAK-REPORT.md](./PR-9-PROJECTION-PARITY-SOAK-REPORT.md)

---

## M6 PR-8 Deliverables

- **Parity:** `src/sdk/events/parity/order/` — validator, comparator, mapper, report, telemetry, factory
- **Domain:** `src/domain/events/parity/order/` — canonical model, rules, result, difference, statistics
- **Flag:** `FF_ORDER_PROJECTION_PARITY_ENABLED` (default OFF; requires all five event/projection flags)
- **Tests:** `eventSdkOrderParity.test.ts` (12), `orderParityDomain.test.ts` (11)
- **Report:** [PR-8-ORDER-PROJECTION-PARITY-REPORT.md](./PR-8-ORDER-PROJECTION-PARITY-REPORT.md)

---

## M6 PR-7 Deliverables

- **Projection:** `src/sdk/events/projections/order/` — worker, mapper, repository, snapshot, validator, telemetry, factory
- **Domain:** `src/domain/events/projections/order/` — state, builders, validation, metadata
- **Flag:** `FF_ORDER_READ_PROJECTION_ENABLED` (default OFF; requires platform + projection + runtime flags)
- **Events consumed:** `order.created.v1`, `order.updated.v1`, `order.cancelled.v1`
- **Tests:** `eventSdkOrderProjection.test.ts` (12), `orderProjectionDomain.test.ts` (10)
- **Report:** [PR-7-FIRST-ORDER-READ-PROJECTION-REPORT.md](./PR-7-FIRST-ORDER-READ-PROJECTION-REPORT.md)

---

## M6 PR-6 Deliverables

- **Runtime:** `src/sdk/events/projection/runtime/` — runtime, coordinator, persistence adapter, checkpoint, snapshot, history, statistics
- **Domain:** `src/domain/events/projection/runtime/` — snapshot, execution, policy, recovery, statistics, validation
- **Flag:** `FF_EVENT_PROJECTION_RUNTIME_ENABLED` (default OFF; requires platform + projection flags)
- **Tests:** `eventSdkProjectionRuntime.test.ts` (5), `projectionRuntimeDomain.test.ts` (10)
- **Report:** [PR-6-PROJECTION-RUNTIME-REPORT.md](./PR-6-PROJECTION-RUNTIME-REPORT.md)

---

## M6 PR-5 Deliverables

- **Business events:** `src/sdk/events/business/orders/` — shadow publisher, mapper, validator, factory
- **Domain:** `src/domain/events/orders/` — created/updated/cancelled payloads, validation
- **Flag:** `FF_ORDER_SHADOW_EVENTS_ENABLED` (default OFF; requires all 4 event flags)
- **Events:** `order.created.v1`, `order.updated.v1`, `order.cancelled.v1`
- **Tests:** `eventSdkOrderShadow.test.ts` (11), `orderEventDomain.test.ts` (9)
- **Report:** [PR-5-FIRST-BUSINESS-EVENT-SHADOW-PUBLISHING-REPORT.md](./PR-5-FIRST-BUSINESS-EVENT-SHADOW-PUBLISHING-REPORT.md)

---

## M6 PR-4.5 Deliverables

- **Governance:** `docs/m6/v1/` — 14 frozen enterprise contract documents
- **ADRs:** [ADR-019](../adr/ADR-019-event-contract-freeze.md) through [ADR-022](../adr/ADR-022-schema-evolution-policy.md)
- **Catalog:** [EVENT-CATALOG.md](./v1/EVENT-CATALOG.md) (canonical v1 registry)
- **No code changes** — documentation and governance only

---

## Feature Flags (default OFF)

| Flag | Purpose |
|------|---------|
| `FF_EVENT_PLATFORM_ENABLED` | Master switch for EventSDK |
| `FF_EVENT_OUTBOX_ENABLED` | Durable outbox publish path |
| `FF_EVENT_REPLAY_ENABLED` | Admin replay engine |
| `FF_EVENT_SHADOW_PUBLISHING_ENABLED` | Firestore shadow publishing |
| `FF_EVENT_PROJECTION_ENABLED` | Projection worker infrastructure |
| `FF_ORDER_SHADOW_EVENTS_ENABLED` | Order business shadow events |
| `FF_EVENT_PROJECTION_RUNTIME_ENABLED` | Generic projection runtime |
| `FF_ORDER_READ_PROJECTION_ENABLED` | Order read shadow projection |
| `FF_ORDER_PROJECTION_PARITY_ENABLED` | Order projection parity validation |
| `FF_ORDER_PROJECTION_SOAK_ENABLED` | Order projection parity soak & certification |
| `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED` | Staging operational validation |
| `FF_ORDER_PROJECTION_ADAPTER_ENABLED` | Order read adapter routing (standalone) |
| `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` | Staged rollout policy (standalone) |
| `FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` | Switch certification (standalone) |

---

## Architectural Law

```
Commands → Domain → Events (Outbox) → Projection → Read Models → Frozen SDKs → Presentation
```

M1–M5 frozen SDKs and M7 Menu Platform are **not modified** by M6 PR-14. OrderSDK public read API (ADR-013) unchanged.

---

**STOP.** M6 PR-14 complete. Await ARB before production activation or adapter wiring milestones.

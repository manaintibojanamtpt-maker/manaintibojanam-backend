# M7 — Catalog Kernel

**Status:** M7 PR-15 complete — Menu Platform v1.0 **FROZEN**  
**Blueprint:** Catalog Kernel (Menu & Catalog SDK)  
**Certification:** [v1.0 Documentation Pack](./v1.0/MENU-PLATFORM-CERTIFICATION.md) · **CONDITIONAL GO**  
**ADR:** [ADR-023](../adr/ADR-023-menu-platform-v1-freeze.md) (accepted)  
**Runtime:** `MENU_SDK_VERSION = 1.0.0` · `MENU_SDK_FROZEN = true` · tag `menu-platform-v1.0` (pending)

---

## Program Index

| PR | Platform | Status |
|----|----------|--------|
| PR-1 | Menu & Catalog SDK Foundation | ✅ Complete |
| PR-2 | Menu Domain Foundation | ✅ Complete |
| PR-3 | Menu Repository Foundation | ✅ Complete |
| PR-4 | Menu SDK Orchestration | ✅ Complete |
| PR-5 | Menu Facade & Presentation | ✅ Complete |
| PR-6 | Menu Projection Foundation | ✅ Complete |
| PR-7 | First Menu Shadow Projection | ✅ Complete |
| PR-8 | Menu Projection Parity Validation | ✅ Complete |
| PR-9 | Menu Projection Soak & Certification | ✅ Complete |
| PR-10 | Menu Operational Validation | ✅ Complete |
| PR-11 | Menu Read Adapter Layer | ✅ Complete |
| PR-12 | Controlled Menu Projection Rollout | ✅ Complete |
| PR-13 | Menu Projection Read Switch Certification | ✅ Complete |
| PR-14 | Menu Platform v1.0 Certification & Freeze | ✅ Complete |
| PR-15 | Menu Platform Metadata Promotion | ✅ Complete — v1.0 frozen |

---

## v1.0 Documentation Pack

| Document | Purpose |
|----------|---------|
| [MENU-PLATFORM-CERTIFICATION.md](./v1.0/MENU-PLATFORM-CERTIFICATION.md) | Certification report & verdict |
| [MENU-PUBLIC-API-v1.md](./v1.0/MENU-PUBLIC-API-v1.md) | Frozen public API |
| [MENU-COMPATIBILITY-MATRIX.md](./v1.0/MENU-COMPATIBILITY-MATRIX.md) | Flag combinations & enable sequence |
| [MENU-TEST-MATRIX.md](./v1.0/MENU-TEST-MATRIX.md) | Test coverage (1033/1033) |
| [MENU-PERFORMANCE-REPORT.md](./v1.0/MENU-PERFORMANCE-REPORT.md) | Performance posture |
| [MENU-OBSERVABILITY.md](./v1.0/MENU-OBSERVABILITY.md) | Telemetry & monitoring |
| [MENU-ROLLBACK.md](./v1.0/MENU-ROLLBACK.md) | L1–L4 rollback procedures |
| [MENU-RELEASE-NOTES-v1.md](./v1.0/MENU-RELEASE-NOTES-v1.md) | Release notes |
| [MENU-GOVERNANCE.md](./v1.0/MENU-GOVERNANCE.md) | Change control |
| [MENU-ARCHITECTURE.md](./v1.0/MENU-ARCHITECTURE.md) | Architecture reference |
| [MENU-MIGRATION-ROADMAP.md](./v1.0/MENU-MIGRATION-ROADMAP.md) | Migration phases |
| [MENU-QUALITY-GATES.md](./v1.0/MENU-QUALITY-GATES.md) | Quality gates (20/20) |
| [MENU-RISK-ASSESSMENT.md](./v1.0/MENU-RISK-ASSESSMENT.md) | Risk matrix |
| [MENU-CHANGELOG-v1.md](./v1.0/MENU-CHANGELOG-v1.md) | Changelog |

**Runtime version:** `MENU_SDK_VERSION = 1.0.0` · `MENU_SDK_FROZEN = true`  
**Git tag:** `menu-platform-v1.0` (prepare after merge — see [menu-platform-v1.0.md](../releases/menu-platform-v1.0.md))

---

## M7 PR-15 Deliverables

- **Version:** `src/sdk/menu/version.ts` — `1.0.0`, `MENU_SDK_FROZEN = true`
- **ADR:** ADR-023 status → Accepted
- **Release notes:** [menu-platform-v1.0.md](../releases/menu-platform-v1.0.md)
- **Tests:** Version assertion updates in `menuSdkFoundation.test.ts`; 1033/1033 pass
- **No behaviour changes.** No contract changes. No feature flag changes.

---

## M7 PR-14 Deliverables

- **Documentation:** Full v1.0 pack (14 documents) in `docs/m7/v1.0/`
- **ADR:** [ADR-023-menu-platform-v1-freeze.md](../adr/ADR-023-menu-platform-v1-freeze.md)
- **Certification:** CONDITIONAL GO — documentation freeze approved; production activation deferred
- **Tests:** 1033 / 1033 passing (no code changes)
- **No runtime changes.** No SDK changes. No feature flag changes.

---

## M7 PR-13 Deliverables

- **Domain:** `src/domain/menu/certification/` — readiness rules, status, evidence, thresholds, metadata
- **Certification:** `src/sdk/menu/certification/` — evaluator, evidence, report, telemetry, factory, repository
- **Flag:** `FF_MENU_PROJECTION_CERTIFICATION_ENABLED` (default OFF)
- **Tests:** `menuProjectionCertificationDomain.test.ts` (10), `menuProjectionSwitchCertification.test.ts` (11)
- **Report:** [PR-13-MENU-PROJECTION-READ-SWITCH-CERTIFICATION-REPORT.md](./PR-13-MENU-PROJECTION-READ-SWITCH-CERTIFICATION-REPORT.md)

**Not wired into MenuSDK, adapter, or rollout.** Every decision package includes `legacyAuthoritative: true` and `productionActivationProhibited: true`.

---

## M7 PR-12 Deliverables

- **Domain:** `src/domain/menu/rollout/` — stages, policy, health, thresholds, decisions
- **Rollout:** `src/sdk/menu/rollout/` — policy, strategy, evaluator, metrics, telemetry, factory
- **Flag:** `FF_MENU_PROJECTION_ROLLOUT_ENABLED` (default OFF)
- **Tests:** `menuRolloutDomain.test.ts` (15), `menuProjectionRollout.test.ts` (12)
- **Report:** [PR-12-CONTROLLED-MENU-PROJECTION-ROLLOUT-REPORT.md](./PR-12-CONTROLLED-MENU-PROJECTION-ROLLOUT-REPORT.md)

**Not wired into MenuSDK or Menu Read Adapter.** Legacy remains authoritative.

---

## M7 PR-11 Deliverables

- **Domain:** `src/domain/menu/adapter/` — decision, rules, source, metadata
- **Adapter:** `src/sdk/menu/adapter/` — read adapter, legacy/projection delegates, mapper, factory, telemetry
- **Flag:** `FF_MENU_PROJECTION_ADAPTER_ENABLED` (default OFF, separate from MenuSDK flags)
- **Tests:** `menuAdapterDomain.test.ts` (8), `menuReadAdapter.test.ts` (13)
- **Report:** [PR-11-MENU-READ-ADAPTER-LAYER-REPORT.md](./PR-11-MENU-READ-ADAPTER-LAYER-REPORT.md)

**Not wired into `createMenuSDK()`.** Legacy remains authoritative.

---

## M7 PR-10 Deliverables

- **Domain:** `src/domain/menu/operations/` — lag, drift, replay, health, thresholds, rules
- **Operational:** `src/sdk/menu/operations/` — validator, analyzers, telemetry, factory
- **Flags:** `FF_MENU_PROJECTION_ENABLED` + `FF_MENU_PROJECTION_PARITY_ENABLED` + `FF_MENU_PROJECTION_SOAK_ENABLED` + `FF_MENU_OPERATIONAL_VALIDATION_ENABLED` (default OFF)
- **Tests:** `menuOperationsDomain.test.ts` (12), `menuCatalogProjectionOperational.test.ts` (11)
- **Report:** [PR-10-MENU-OPERATIONAL-VALIDATION-REPORT.md](./PR-10-MENU-OPERATIONAL-VALIDATION-REPORT.md)

---

## M7 PR-9 Deliverables

- **Domain:** `src/domain/menu/parity/soak/` — thresholds, health, readiness, trend, certification rules
- **Soak:** `src/sdk/menu/parity/soak/` — runner, analyzer, metrics, certification, telemetry, factory
- **Flags:** `FF_MENU_PROJECTION_ENABLED` + `FF_MENU_PROJECTION_PARITY_ENABLED` + `FF_MENU_PROJECTION_SOAK_ENABLED` (default OFF)
- **Tests:** `menuProjectionSoakDomain.test.ts` (4), `menuCatalogProjectionSoak.test.ts` (11)
- **Report:** [PR-9-MENU-PROJECTION-SOAK-CERTIFICATION-REPORT.md](./PR-9-MENU-PROJECTION-SOAK-CERTIFICATION-REPORT.md)

---

## M7 PR-4 Deliverables

- **Orchestration:** `src/sdk/menu/orchestration/` — orchestrator, default adapter, mapper, errors, telemetry, factory
- **Factory:** `createMenuSDK()` delegates to orchestration (signature unchanged)
- **Flag:** `FF_MENU_ENABLED` only (default OFF)
- **Tests:** `menuSdkOrchestration.test.ts` (16)
- **Report:** [PR-4-MENU-SDK-ORCHESTRATION-REPORT.md](./PR-4-MENU-SDK-ORCHESTRATION-REPORT.md)

---

## M7 PR-3 Deliverables

- **Repository:** `src/sdk/menu/repository/` — persistence models, port, mapper, adapter, stub, factory
- **Flag:** `FF_MENU_ENABLED` only (default OFF; no new flags)
- **Tests:** `menuRepositoryFoundation.test.ts` (14)
- **Report:** [PR-3-MENU-REPOSITORY-FOUNDATION-REPORT.md](./PR-3-MENU-REPOSITORY-FOUNDATION-REPORT.md)

---

## M7 PR-2 Deliverables

- **Domain:** `src/domain/menu/` — catalog, pricing, availability, modifiers, combos, validation, shared
- **Rules:** Pure validation functions and domain validators
- **Tests:** `menuDomainFoundation.test.ts` (16)
- **Report:** [PR-2-MENU-DOMAIN-FOUNDATION-REPORT.md](./PR-2-MENU-DOMAIN-FOUNDATION-REPORT.md)

---

## M7 PR-1 Deliverables

- **MenuSDK:** `src/sdk/menu/` — contracts, DTOs, ports, stub/default adapters, factory, flags
- **Domain:** `src/domain/menu/` — placeholder types, validation, shared constants
- **Flags:** `FF_MENU_ENABLED`, `FF_MENU_SEARCH_ENABLED`, `FF_MENU_PROJECTION_ENABLED` (all default OFF)
- **Tests:** `menuSdkFoundation.test.ts` (14), `menuDomainFoundation.test.ts` (2)
- **Report:** [PR-1-MENU-SDK-FOUNDATION-REPORT.md](./PR-1-MENU-SDK-FOUNDATION-REPORT.md)

---

**STOP.** M7 program complete through PR-15. Await ARB before any production activation or adapter wiring milestone.

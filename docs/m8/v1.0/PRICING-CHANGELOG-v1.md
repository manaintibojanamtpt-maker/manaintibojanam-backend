# Pricing Platform Changelog v1.0

**Version:** 1.0.0 (frozen)  
**Date:** 2026-07-03  
**Runtime:** `1.0.0` · `PRICING_SDK_FROZEN = true`

---

## [1.0.0] — 2026-07-03 — Metadata Promotion (PR-15)

### Changed

- `PRICING_SDK_VERSION` — `0.1.0-foundation` → `1.0.0`
- `PRICING_SDK_FROZEN` — `false` → `true`
- `src/sdk/pricing/README.md` — version, frozen status, compatibility
- `docs/m8/README.md` — PR-15 complete, v1.0 frozen
- `docs/m8/v1.0/PRICING-PLATFORM-CERTIFICATION.md` — runtime metadata promoted
- `docs/adr/ADR-025-pricing-platform-v1-freeze.md` — status Accepted
- `pricingSdkFoundation.test.ts` — version assertion updates

### Added

- `docs/releases/pricing-platform-v1.0.md` — release notes

### Unchanged (by design)

- PricingSDK 8-method contract
- All DTOs
- All 11 feature flags — remain OFF
- PricingSDK routing — legacy authoritative
- No adapter/rollout wiring
- No Firestore migration
- No production routing

---

## [1.0.0-doc] — 2026-07-03 — Documentation Freeze (PR-14)

### Added

- `docs/m8/v1.0/` — full v1.0 documentation pack (14 documents)
- `docs/adr/ADR-025-pricing-platform-v1-freeze.md` (Proposed)
- Certification report with CONDITIONAL GO verdict
- Public API documentation for 8-method PricingSDK contract
- Compatibility matrix for 11 feature flags
- Test matrix (293 pricing tests, 1326 full suite)
- Performance posture documentation
- Observability event catalog
- L1–L4 rollback procedures
- Governance and migration roadmap
- Quality gates verification (20/20 PASS)
- Risk assessment with mitigations

### Changed

- `docs/m8/README.md` — PR-14 complete, v1.0 pack linked
- `src/sdk/pricing/README.md` — updated to v1.0 architecture status

### Unchanged (by design)

- `PRICING_SDK_VERSION` — remains `0.1.0-foundation`
- `PRICING_SDK_FROZEN` — remains `false`
- All 11 feature flags — remain OFF
- PricingSDK routing — legacy authoritative
- No adapter/rollout wiring
- No Firestore migration
- No production routing

---

## [0.1.0-foundation] — M8 PR-1 through PR-13

### PR-1 — PricingSDK Foundation
- `PricingSDK` contract (8 methods)
- Domain money, tax, coupons
- Stub adapter, feature flags
- `createPricingSDK()` factory

### PR-2 — Pricing Domain Foundation
- Pure domain models, validation, builders

### PR-3 — Pricing Repository Foundation
- Provider-neutral repository port

### PR-4 — SDK Orchestration
- `DefaultPricingAdapter`, orchestrator, telemetry

### PR-5 — PricingFacade & Presentation
- Presentation boundary, session lifecycle

### PR-6 — Projection Foundation
- Coordinator, checkpoint, in-memory repos

### PR-7 — First Shadow Projection
- Pricing catalog read model (`pricing-catalog-read-shadow`)

### PR-8 — Projection Parity Validation
- Comparator, report repository

### PR-9 — Soak & Certification
- Soak runner, health analyzer, certification repo

### PR-10 — Operational Validation
- Lag, drift, replay, health monitor

### PR-11 — Read Adapter Layer
- Standalone legacy ↔ projection adapter (not wired)

### PR-12 — Controlled Rollout
- Staged percentage policy (not wired)

### PR-13 — Switch Certification
- GO/NO-GO decision packages (not wired)

---

**STOP.** M8 PR-16 blocked until ARB approval.

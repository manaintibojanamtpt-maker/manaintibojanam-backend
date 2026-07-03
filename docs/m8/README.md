# M8 — Pricing & Commerce Platform

**Program:** BHOS-M8  
**Status:** PR-15 complete — Pricing Platform v1.0 **FROZEN**  
**SDK Version:** `1.0.0` · `PRICING_SDK_FROZEN = true`  
**Domain Version:** `0.2.0-domain-foundation` (unchanged)  
**Governance:** ADR-025 Accepted

---

## Documents

### PR Reports

| Document | Purpose |
|----------|---------|
| [PR-1 through PR-14 reports](./) | Milestone implementation reports |
| [PR-14-PRICING-PLATFORM-V1-CERTIFICATION-FREEZE-REPORT.md](./PR-14-PRICING-PLATFORM-V1-CERTIFICATION-FREEZE-REPORT.md) | M8 PR-14 v1.0 freeze |
| [PR-15-PRICING-PLATFORM-METADATA-PROMOTION-REPORT.md](./PR-15-PRICING-PLATFORM-METADATA-PROMOTION-REPORT.md) | M8 PR-15 metadata promotion |

### v1.0 Governance Pack

| Document | Purpose |
|----------|---------|
| [v1.0/PRICING-PLATFORM-CERTIFICATION.md](./v1.0/PRICING-PLATFORM-CERTIFICATION.md) | Certification report |
| [v1.0/PRICING-PUBLIC-API-v1.md](./v1.0/PRICING-PUBLIC-API-v1.md) | Frozen public API |
| [v1.0/PRICING-ARCHITECTURE.md](./v1.0/PRICING-ARCHITECTURE.md) | Architecture |
| [v1.0/PRICING-COMPATIBILITY-MATRIX.md](./v1.0/PRICING-COMPATIBILITY-MATRIX.md) | Feature flags |
| [v1.0/PRICING-TEST-MATRIX.md](./v1.0/PRICING-TEST-MATRIX.md) | Test matrix |
| [v1.0/PRICING-QUALITY-GATES.md](./v1.0/PRICING-QUALITY-GATES.md) | Quality gates (20/20) |
| [v1.0/PRICING-PERFORMANCE-REPORT.md](./v1.0/PRICING-PERFORMANCE-REPORT.md) | Performance |
| [v1.0/PRICING-OBSERVABILITY.md](./v1.0/PRICING-OBSERVABILITY.md) | Observability |
| [v1.0/PRICING-ROLLBACK.md](./v1.0/PRICING-ROLLBACK.md) | Rollback L1–L4 |
| [v1.0/PRICING-GOVERNANCE.md](./v1.0/PRICING-GOVERNANCE.md) | Governance |
| [v1.0/PRICING-MIGRATION-ROADMAP.md](./v1.0/PRICING-MIGRATION-ROADMAP.md) | Roadmap |
| [v1.0/PRICING-RISK-ASSESSMENT.md](./v1.0/PRICING-RISK-ASSESSMENT.md) | Risk assessment |
| [v1.0/PRICING-CHANGELOG-v1.md](./v1.0/PRICING-CHANGELOG-v1.md) | Changelog |
| [v1.0/PRICING-RELEASE-NOTES-v1.md](./v1.0/PRICING-RELEASE-NOTES-v1.md) | Release notes |
| [../releases/pricing-platform-v1.0.md](../releases/pricing-platform-v1.0.md) | Release package |
| [../adr/ADR-025-pricing-platform-v1-freeze.md](../adr/ADR-025-pricing-platform-v1-freeze.md) | ADR (Accepted) |

### Module READMEs

| Document | Purpose |
|----------|---------|
| [../../src/sdk/pricing/README.md](../../src/sdk/pricing/README.md) | PricingSDK README |
| [../../src/sdk/pricing/adapter/README.md](../../src/sdk/pricing/adapter/README.md) | Read adapter |
| [../../src/sdk/pricing/rollout/README.md](../../src/sdk/pricing/rollout/README.md) | Rollout |
| [../../src/sdk/pricing/certification/README.md](../../src/sdk/pricing/certification/README.md) | Certification |

---

## Milestones

| PR | Scope | Status |
|----|-------|--------|
| PR-1 | PricingSDK contracts, DTOs, ports, stubs, flags | ✓ Complete |
| PR-2 | Pure pricing domain models, validation, builders | ✓ Complete |
| PR-3 | Repository abstraction, persistence port, mapper | ✓ Complete |
| PR-4 | SDK orchestration, default adapter, factory routing | ✓ Complete |
| PR-5 | PricingFacade, session lifecycle, retry/reset | ✓ Complete |
| PR-6 | Projection infrastructure, coordinator, in-memory repos | ✓ Complete |
| PR-7 | First pricing shadow projection (catalog read model) | ✓ Complete |
| PR-8 | Pricing projection parity validation | ✓ Complete |
| PR-9 | Pricing projection soak & certification | ✓ Complete |
| PR-10 | Pricing operational validation | ✓ Complete |
| PR-11 | Pricing read adapter layer (standalone) | ✓ Complete |
| PR-12 | Controlled pricing projection rollout | ✓ Complete |
| PR-13 | Pricing projection read switch certification | ✓ Complete |
| PR-14 | Pricing platform v1.0 certification & freeze | ✓ Complete |
| PR-15 | Pricing platform metadata promotion | ✓ Complete |
| PR-16 | Unified commerce platform v1.0 certification | **STOP — ARB approval required** |

---

## Scope

Pricing · Taxes · GST · Discounts · Coupons · Offers · Campaigns · Delivery/Packaging fees · Price lists · Branch overrides · Dynamic pricing · Projection infrastructure · Shadow projections · Parity · Soak · Operational validation · Read adapter · Rollout · Switch certification · **v1.0 frozen**.

**Independent of M1–M7.** Production activation prohibited until staging soak and explicit rollout approval.

---

**STOP.**

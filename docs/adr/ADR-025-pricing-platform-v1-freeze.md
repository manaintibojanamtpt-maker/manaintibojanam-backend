# ADR-025: Pricing & Commerce Platform v1.0 Freeze

**Status:** Accepted  
**Date:** 2026-07-03  
**Accepted:** 2026-07-03 (ARB)  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A (first stable Pricing Platform release)  
**Related:** ADR-011 (SDK Strangler), FEB-001, BHOS-M8

---

## Context

BhojanOS M8 (Pricing & Commerce Platform) delivered PR-1 through PR-14:

- **PricingSDK** with 8 public methods and `createPricingSDK()` factory
- **PricingRepository** provider-neutral read/calculation port
- **Pricing domain** — money, tax, coupons, projection, parity, soak, operations, adapter, rollout, certification
- **PricingFacade** presentation boundary
- **SDK orchestration** with feature flag gating
- **Projection foundation** — coordinator, checkpoint, snapshot
- **Shadow catalog projection** — metadata read model
- **Parity validation** — legacy vs projection comparison
- **Soak certification** — health monitoring
- **Operational validation** — lag, drift, replay evidence
- **Read adapter** — legacy ↔ projection routing (standalone)
- **Staged rollout** — percentage-based policy (standalone)
- **Switch certification** — GO/NO-GO decision packages (standalone)

All functionality ships behind 11 `FF_PRICING_*` feature flags defaulting **OFF**. Legacy remains the authoritative read source. Adapter, rollout, and certification are **not wired** into `createPricingSDK()`.

M8 PR-14 certifies the platform for v1.0 documentation freeze without runtime code changes. Version constant promotion is deferred to M8 PR-15.

**Test evidence:** 1326 / 1326 passing (`npm run test:sdk`).

---

## Decision

1. **Freeze** Pricing & Commerce Platform at version **1.0.0** (documentation) effective upon ARB acceptance of this ADR.

2. **Frozen public surface — `PricingSDK`:**
   - `getPrice(query: GetPriceQuery)`
   - `calculatePrice(query: CalculatePriceQuery)`
   - `validatePricing(input: ValidatePricingInput)`
   - `applyCoupon(query: ApplyCouponQuery)`
   - `calculateTaxes(query: CalculateTaxesQuery)`
   - `calculateDeliveryFee(query: CalculateDeliveryFeeQuery)`
   - `calculatePackagingFee(query: CalculatePackagingFeeQuery)`
   - `calculateFinalBill(query: CalculateFinalBillQuery)`
   - `createPricingSDK(options?)`

3. **Frozen repository port:**
   - `PricingRepository` — `src/sdk/pricing/repository/`

4. **Frozen presentation surface:**
   - `PricingFacade` — `src/lib/pricing/PricingFacade.ts`

5. **Frozen DTOs:**
   - All types in `src/sdk/pricing/dto/`

6. **Frozen feature flags (names and defaults):**
   - `FF_PRICING_ENABLED` — default OFF
   - `FF_DYNAMIC_PRICING_ENABLED` — default OFF
   - `FF_COUPONS_ENABLED` — default OFF
   - `FF_OFFERS_ENABLED` — default OFF
   - `FF_PRICING_PROJECTION_ENABLED` — default OFF
   - `FF_PRICING_PROJECTION_PARITY_ENABLED` — default OFF
   - `FF_PRICING_PROJECTION_SOAK_ENABLED` — default OFF
   - `FF_PRICING_OPERATIONAL_VALIDATION_ENABLED` — default OFF
   - `FF_PRICING_PROJECTION_ADAPTER_ENABLED` — default OFF
   - `FF_PRICING_PROJECTION_ROLLOUT_ENABLED` — default OFF
   - `FF_PRICING_PROJECTION_CERTIFICATION_ENABLED` — default OFF

7. **Version constants (M8 PR-15 — promoted 2026-07-03):**
   - `PRICING_SDK_VERSION = '1.0.0'` ✅
   - `PRICING_SDK_FROZEN = true` ✅
   - Git tag: `pricing-platform-v1.0` (pending — see release commands)

8. **Explicit exclusions from v1.0:**
   - PricingSDK → adapter wiring
   - PricingSDK → rollout wiring
   - Production routing / read switch
   - Firestore pricing collection migration
   - Full price matrix projection (catalog metadata only in PR-7)
   - Production feature flag enablement
   - Real pricing/GST/coupon calculations
   - Performance benchmarks and prod dashboards

9. **No runtime behaviour changes in PR-14** — documentation, validation, and certification only.

10. **Certification verdict:** CONDITIONAL GO
    - **GO** for documentation freeze and ARB acceptance
    - **NO GO** for production activation until PR-15, staging soak, and explicit rollout approval

---

## Consequences

### Positive

- Stable PricingSDK contract for Presentation and server consumers
- Complete evidence chain for future projection read switch
- Rollback procedures documented (L1–L4)
- Full test coverage (293 pricing-focused, 1326 platform suite)
- No impact on frozen platforms (M1–M7)

### Negative / trade-offs

- ~~Version constants remain at `0.1.0-foundation` until PR-15~~ **Resolved:** `1.0.0` promoted in PR-15.
- Adapter/rollout infrastructure exists but is not usable via PricingSDK
- No production soak evidence yet
- Catalog-metadata projection only — full price matrix requires legacy reads

### Governance

- Breaking changes to frozen surface require new ADR + major version bump
- Wiring adapter into PricingSDK requires separate ADR + ARB approval
- Production activation requires PR-13 certification `READY` or `CONDITIONAL`

---

## Alternatives considered

1. **Promote version constants in PR-14** — Rejected. Metadata promotion is a separate governed step (PR-15) after ARB approval, consistent with Menu Platform (ADR-023).

2. **Wire adapter into PricingSDK in PR-14** — Rejected. Violates incremental rollout strategy; requires staging soak first.

3. **NO GO — defer freeze until production soak** — Rejected. Architecture is complete; documentation freeze enables ARB review while staging soak proceeds in parallel.

4. **Full price matrix projection in v1.0** — Rejected. Scope creep; catalog metadata sufficient for shadow evidence chain.

---

## References

- [PRICING-PLATFORM-CERTIFICATION.md](../m8/v1.0/PRICING-PLATFORM-CERTIFICATION.md)
- [PRICING-PUBLIC-API-v1.md](../m8/v1.0/PRICING-PUBLIC-API-v1.md)
- [PRICING-ARCHITECTURE.md](../m8/v1.0/PRICING-ARCHITECTURE.md)
- [PRICING-QUALITY-GATES.md](../m8/v1.0/PRICING-QUALITY-GATES.md)
- [docs/m8/README.md](../m8/README.md)
- ADR-023 (Menu Platform v1.0 freeze — template)

---

**M8 PR-15 complete.** Metadata promoted. Production activation remains prohibited until staging soak and explicit rollout approval.

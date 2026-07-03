# M8 PR-8 — Pricing Projection Parity Validation Report

**Program:** BHOS-M8  
**Milestone:** M8 PR-8 — Pricing Projection Parity Validation  
**Status:** Complete — Awaiting Architecture Review Board approval  
**Date:** 2026-07-03

---

## Executive Summary

M8 PR-8 delivers **Pricing Projection Parity Validation** — catalog-centric comparison between legacy pricing repository reads and the shadow projection read model. Validation only. No PricingSDK routing, adapter switch, Event Platform wiring, or Firestore integration.

**Test result:** 1212 / 1212 passing (+21 from PR-7 baseline of 1191).

---

## Architecture Validation

| Constraint | Status |
|------------|--------|
| PricingSDK contracts unchanged | ✓ |
| DTOs unchanged | ✓ |
| Existing pricing domain unchanged (additive parity/) | ✓ |
| Repository / orchestration / facade unchanged | ✓ |
| PR-6 projection foundation unchanged | ✓ |
| PR-7 shadow projection unchanged | ✓ |
| M1–M7 frozen platforms untouched | ✓ |
| No Firestore / runtime / React | ✓ |
| No Event / Menu / Order integration | ✓ |
| Feature flags default OFF | ✓ |
| Dual gate required (projection + parity) | ✓ |

---

## Generated Files

### Domain (`src/domain/pricing/parity/`)

| File | Purpose |
|------|---------|
| `PricingCanonicalModel.ts` | Legacy document + canonical model, timestamp/status normalization |
| `PricingParityRules.ts` | Field comparison rules and outcome resolution |
| `PricingParityDifference.ts` | Difference record builder |
| `PricingParityStatistics.ts` | Accumulation and summary percentages |
| `PricingParityResult.ts` | Outcome types and report record |
| `README.md` | Domain documentation |

### SDK (`src/sdk/pricing/parity/`)

| File | Purpose |
|------|---------|
| `pricingParityPorts.ts` | Legacy/projection read ports, report repository, infrastructure port |
| `PricingParityMapper.ts` | Legacy and projection → canonical normalization |
| `PricingParityComparator.ts` | Dual-gated comparison pipeline |
| `PricingParityValidator.ts` | priceListId validation |
| `PricingParityReport.ts` | In-memory report repository |
| `PricingParityTelemetry.ts` | Placeholder telemetry hooks |
| `PricingParityFactory.ts` | Infrastructure factory with in-memory seed ports |
| `README.md` | SDK documentation |

### Feature Flag (additive)

| Flag | Default | Environment Variable |
|------|---------|---------------------|
| `FF_PRICING_PROJECTION_PARITY_ENABLED` | `false` | `VITE_FF_PRICING_PROJECTION_PARITY_ENABLED` |

### Tests

| File | Tests |
|------|-------|
| `pricingParityDomain.test.ts` | 9 |
| `pricingProjectionParity.test.ts` | 12 |

---

## Parity Flow

```
FF_PRICING_PROJECTION_ENABLED AND FF_PRICING_PROJECTION_PARITY_ENABLED
        ↓
Validate priceListId
        ↓
Load legacy repository (read-only)
        ↓
Load projection repository (read-only)
        ↓
Map both → PricingCanonicalModel
        ↓
Compare (pure domain)
        ↓
Generate parity result
        ↓
Persist report (optional via compareAndReport)
        ↓
Emit telemetry
        ↓
STOP
```

Neither repository is modified during comparison.

---

## Canonical Model

Compared fields:

| Field | Description |
|-------|-------------|
| `priceListId` | Aggregate identifier |
| `tenantId` | Tenant scope |
| `branchId` | Optional branch scope |
| `pricingVersion` | Catalog version |
| `status` | Lifecycle status (normalized) |
| `priceCount` | Price entry count |
| `couponCount` | Coupon count |
| `campaignCount` | Campaign count |
| `offerCount` | Offer count |
| `updatedAt` | Last update timestamp (ISO) |

Ignored fields: `projectionVersion`, snapshot metadata, telemetry, checkpoint IDs, price values, GST, discount calculations, coupon/campaign/offer payloads.

---

## Comparison Rules

| Outcome | Condition |
|---------|-----------|
| `MATCH` | All comparable fields equal |
| `VERSION_MISMATCH` | `pricingVersion` differs |
| `FIELD_MISMATCH` | Non-version field differs |
| `MISSING_IN_PROJECTION` | Legacy exists, projection absent |
| `MISSING_IN_LEGACY` | Projection exists, legacy absent |
| `UNSUPPORTED` | Both sources absent |

---

## Statistics

| Metric | Description |
|--------|-------------|
| `totalCompared` | Total comparisons run |
| `matchPercent` | Percentage of MATCH outcomes |
| `fieldParityPercent` | Field-level parity percentage |
| `missingPercent` | Missing-in-projection or missing-in-legacy percentage |
| `averageComparisonDurationMs` | Mean comparison duration |

Mismatch counters: `versionMismatches`, `fieldMismatches`, `missingInProjection`, `missingInLegacy`, `unsupported`.

---

## Telemetry

| Event | When |
|-------|------|
| `pricing_parity_started` | Comparison begins |
| `pricing_parity_completed` | Comparison finished |
| `pricing_parity_failed` | Load or internal failure |
| `pricing_parity_match` | Outcome is MATCH |
| `pricing_parity_mismatch` | Outcome is not MATCH |

---

## Feature Flag

Dual gate required:

1. `FF_PRICING_PROJECTION_ENABLED` — projection infrastructure
2. `FF_PRICING_PROJECTION_PARITY_ENABLED` — parity validation

Both default **OFF**. Either flag OFF → `NOT_CONFIGURED`.

---

## Testing Summary

| Area | Coverage |
|------|----------|
| Perfect match | ✓ |
| Version mismatch | ✓ |
| Field mismatch | ✓ |
| Missing projection | ✓ |
| Missing legacy | ✓ |
| Unsupported (both missing) | ✓ |
| Statistics | ✓ |
| Telemetry | ✓ |
| Feature flag OFF | ✓ |
| Dual gate | ✓ |
| Report persistence | ✓ |
| priceListId validation | ✓ |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental PricingSDK routing | No factory/orchestrator wiring; validation-only ports |
| Repository mutation during parity | Read-only ports; in-memory test seeds only |
| Price data leakage | Canonical model excludes price values and payloads |
| Cross-platform contamination | No Event/Menu/Order imports |
| PR-6/PR-7 regression | Separate parity directory; prior files untouched |

---

## Rollback Plan

1. Set `VITE_FF_PRICING_PROJECTION_PARITY_ENABLED=false` (default).
2. Remove test entries from `package.json` if reverting entirely.
3. Delete `src/domain/pricing/parity/` and `src/sdk/pricing/parity/` directories.
4. Revert additive flag in `featureFlags.ts`.
5. No database, runtime, or deployment changes to revert.

---

## Definition of Done

- [x] Canonical pricing model
- [x] Comparison engine operational
- [x] Statistics generated
- [x] Report repository operational
- [x] Telemetry operational
- [x] Feature flags OFF by default
- [x] No PricingSDK routing
- [x] No Event Platform wiring
- [x] Documentation complete
- [x] All tests passing (1212)

---

## Certification Checklist

| Item | Status |
|------|--------|
| PricingSDK unchanged | ✓ |
| DTOs unchanged | ✓ |
| Domain (PR-2) unchanged | ✓ |
| Repository unchanged | ✓ |
| Orchestration unchanged | ✓ |
| Facade unchanged | ✓ |
| PR-6 foundation unchanged | ✓ |
| PR-7 shadow projection unchanged | ✓ |
| M1–M7 frozen | ✓ |
| No Firestore | ✓ |
| No runtime consumers | ✓ |
| Deterministic tests | ✓ |

---

**STOP — M8 PR-9 (Pricing Projection Soak & Certification) requires explicit ARB approval.**

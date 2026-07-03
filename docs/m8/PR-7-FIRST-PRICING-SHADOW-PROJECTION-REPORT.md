# M8 PR-7 — First Pricing Shadow Projection Report

**Program:** BHOS-M8  
**Milestone:** M8 PR-7 — First Pricing Shadow Projection  
**Status:** Complete — Awaiting Architecture Review Board approval  
**Date:** 2026-07-03

---

## Executive Summary

M8 PR-7 delivers the **first Pricing Shadow Projection** — an isolated, feature-flagged worker that processes mock pricing catalog event envelopes into a metadata-only read model. No PricingSDK routing, Event Platform wiring, Firestore, or runtime consumers were introduced.

**Test result:** 1191 / 1191 passing (+22 from PR-6 baseline of 1169).

---

## Architecture Validation

| Constraint | Status |
|------------|--------|
| PricingSDK contracts unchanged | ✓ |
| DTOs unchanged | ✓ |
| Existing pricing domain unchanged (additive projections/) | ✓ |
| Repository / orchestration / facade unchanged | ✓ |
| PR-6 projection foundation unchanged | ✓ |
| M1–M7 frozen platforms untouched | ✓ |
| No Firestore / runtime / React | ✓ |
| No Event / Menu / Order integration | ✓ |
| Feature flag default OFF | ✓ |
| Shadow projection only — no production routing | ✓ |

---

## Generated Files

### Domain (`src/domain/pricing/projections/pricing/`)

| File | Purpose |
|------|---------|
| `PricingProjectionMetadata.ts` | Event types, mock payload schemas, projection identity |
| `PricingProjectionState.ts` | Read model + metadata-only snapshot record |
| `PricingProjectionBuilders.ts` | Pure create/update/delete builders |
| `PricingProjectionValidation.ts` | Read model validation, forbidden field guards |
| `README.md` | Domain documentation |

### SDK (`src/sdk/pricing/projections/pricing/`)

| File | Purpose |
|------|---------|
| `pricingProjectionPorts.ts` | Envelope, repository, snapshot, worker ports |
| `PricingProjectionWorker.ts` | Shadow projection worker pipeline |
| `PricingProjectionMapper.ts` | Envelope → read model mapping |
| `PricingProjectionRepository.ts` | In-memory repository (save/load/list/count/delete) |
| `PricingProjectionSnapshot.ts` | Metadata-only snapshot store |
| `PricingProjectionValidator.ts` | Envelope and transition validation |
| `PricingProjectionTelemetry.ts` | Placeholder telemetry hooks |
| `createPricingProjectionWorker.ts` | Factory bundle |
| `README.md` | SDK documentation |

### Tests

| File | Tests |
|------|-------|
| `pricingProjectionDomain.test.ts` | 9 |
| `pricingCatalogShadowProjection.test.ts` | 13 |

---

## Projection Flow

```
Mock pricing event envelope
        ↓
FF_PRICING_PROJECTION_ENABLED gate
        ↓
Validate envelope (correlationId required)
        ↓
Load existing read model
        ↓
Validate transition
        ↓
Apply pure domain builder
        ↓
Validate read model (metadata only)
        ↓
Persist in-memory repository
        ↓
Persist metadata snapshot
        ↓
Emit telemetry
        ↓
Return { applied: true | false }
```

Worker never throws — unexpected failures return `{ applied: false }`.

---

## Read Model

`PricingCatalogProjectionReadModel` — aggregate root keyed by `priceListId`.

| Field | Description |
|-------|-------------|
| `priceListId` | Aggregate identifier |
| `tenantId` | Tenant scope |
| `branchId` | Optional branch scope |
| `pricingVersion` | Catalog version |
| `status` | Catalog lifecycle status |
| `priceCount` | Count of prices (not values) |
| `couponCount` | Count of coupons |
| `campaignCount` | Count of campaigns |
| `offerCount` | Count of offers |
| `updatedAt` | Last event timestamp |
| `projectionVersion` | Projection schema version |

**Excluded:** price values, GST, discounts, coupon/campaign/offer payloads, dynamic pricing, billing calculations.

---

## Supported Events

Mock envelope schemas only — no publishers, no Event Platform imports.

| Event | Transition |
|-------|------------|
| `pricing.catalog.created.v1` | Create read model |
| `pricing.catalog.updated.v1` | Update existing read model |
| `pricing.catalog.deleted.v1` | Mark deleted |

---

## Telemetry

Placeholder events only:

| Event | When |
|-------|------|
| `pricing_projection_started` | Worker begins processing |
| `pricing_projection_processed` | Read model applied |
| `pricing_projection_completed` | Pipeline finished |
| `pricing_projection_failed` | Validation or persistence failure |
| `pricing_projection_snapshot_saved` | Snapshot persisted |

---

## Feature Flag

| Flag | Default | Environment Variable |
|------|---------|---------------------|
| `FF_PRICING_PROJECTION_ENABLED` | `false` | `VITE_FF_PRICING_PROJECTION_ENABLED` |

Flag OFF → stub worker returns `NOT_CONFIGURED`.

---

## Testing Summary

| Area | Coverage |
|------|----------|
| Catalog create | ✓ |
| Catalog update | ✓ |
| Catalog delete | ✓ |
| Unsupported event | ✓ |
| Missing correlationId | ✓ |
| Validation failures | ✓ |
| Repository persistence | ✓ |
| Snapshot persistence (metadata only) | ✓ |
| Telemetry | ✓ |
| Feature flag OFF | ✓ |
| Worker never throws | ✓ |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental production routing | Feature flag OFF by default; no SDK/facade wiring |
| Price data leakage into read model | Forbidden field validation; metadata-only snapshot |
| Cross-platform contamination | No imports from Event/Menu/Order platforms |
| PR-6 foundation regression | Separate directory tree; PR-6 files untouched |

---

## Rollback Plan

1. Set `VITE_FF_PRICING_PROJECTION_ENABLED=false` (default).
2. Remove test entries from `package.json` if reverting entirely.
3. Delete `src/domain/pricing/projections/` and `src/sdk/pricing/projections/` directories.
4. No database, runtime, or deployment changes to revert.

---

## Definition of Done

- [x] Shadow projection implemented
- [x] Metadata-only read model
- [x] Projection worker operational
- [x] In-memory repository operational
- [x] Snapshot persistence operational
- [x] Telemetry operational
- [x] Feature flag OFF by default
- [x] No PricingSDK integration
- [x] No Event Platform wiring
- [x] Documentation complete
- [x] All tests passing (1191)

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
| M1–M7 frozen | ✓ |
| No Firestore | ✓ |
| No runtime consumers | ✓ |
| Deterministic tests | ✓ |

---

**STOP — M8 PR-8 (Pricing Projection Parity Validation) requires explicit ARB approval.**

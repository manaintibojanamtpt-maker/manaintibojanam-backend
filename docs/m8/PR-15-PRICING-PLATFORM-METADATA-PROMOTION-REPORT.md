# M8 PR-15 — Pricing Platform Metadata Promotion Report

**Program:** BHOS-M8  
**Milestone:** M8 PR-15 — Pricing Platform Metadata Promotion  
**Status:** Complete — Awaiting Architecture Review Board acknowledgment  
**Date:** 2026-07-03

---

## Executive Summary

M8 PR-15 promotes Pricing Platform **governance metadata only** — mirroring M6 PR-14 (Event) and M7 PR-15 (Menu). Version constants updated to `1.0.0` / `true`. ADR-025 Accepted. No PricingSDK behaviour changes. No feature flag changes.

**Test result:** 1326 / 1326 passing (unchanged).

---

## Metadata Promotion

| Constant | Before | After |
|----------|--------|-------|
| `PRICING_SDK_VERSION` | `0.1.0-foundation` | `1.0.0` |
| `PRICING_SDK_FROZEN` | `false` | `true` |

**File:** `src/sdk/pricing/version.ts`

---

## Files Changed

| File | Change |
|------|--------|
| `src/sdk/pricing/version.ts` | Version promotion |
| `src/sdk/__tests__/pricingSdkFoundation.test.ts` | Version assertions |
| `src/sdk/pricing/README.md` | Frozen status |
| `docs/m8/README.md` | PR-15 complete |
| `docs/m8/v1.0/PRICING-PLATFORM-CERTIFICATION.md` | Runtime promoted |
| `docs/m8/v1.0/PRICING-CHANGELOG-v1.md` | PR-15 entry |
| `docs/m8/v1.0/PRICING-RELEASE-NOTES-v1.md` | Metadata promoted |
| `docs/m8/v1.0/PRICING-PUBLIC-API-v1.md` | Runtime status |
| `docs/m8/v1.0/PRICING-ARCHITECTURE.md` | Version table |
| `docs/m8/v1.0/PRICING-COMPATIBILITY-MATRIX.md` | Version row |
| `docs/adr/ADR-025-pricing-platform-v1-freeze.md` | Accepted |
| `docs/adr/README.md` | ADR-025 Accepted |
| `docs/releases/pricing-platform-v1.0.md` | **New** release package |

---

## Architecture Validation

| Constraint | Status |
|------------|--------|
| PricingSDK implementation unchanged | ✓ (version.ts only) |
| DTOs unchanged | ✓ |
| Repository / orchestration / facade unchanged | ✓ |
| Projection / adapter / rollout / certification unchanged | ✓ |
| M1–M7 untouched | ✓ |
| Feature flags unchanged | ✓ |
| No production routing | ✓ |
| Metadata-only diff | ✓ |

---

## Risk Assessment

| Risk | Level |
|------|-------|
| Production impact | None |
| Runtime behaviour change | None |
| API change | None |
| Routing change | None |
| Flag change | None |
| Regression risk | Low |
| **Overall** | **LOW** |

---

## Rollback Plan

```bash
git revert <PR-15-commit>
```

Restore:
- `PRICING_SDK_VERSION = '0.1.0-foundation'`
- `PRICING_SDK_FROZEN = false`
- Version test assertions
- ADR-025 → Proposed (if reverting docs)

Delete tag if created:
```bash
git tag -d pricing-platform-v1.0
git push origin :refs/tags/pricing-platform-v1.0
```

Re-run: `npm run test:sdk` → expect 1326/1326.

---

## Git Tag (document only — not executed)

```bash
git checkout main
git pull origin main
npm run test:sdk
git tag -a pricing-platform-v1.0 -m "Pricing Platform v1.0.0 — ADR-025 frozen release (M8 PR-15)"
git show pricing-platform-v1.0
git push origin pricing-platform-v1.0
```

---

## Definition of Done

- [x] `PRICING_SDK_VERSION = '1.0.0'`
- [x] `PRICING_SDK_FROZEN = true`
- [x] ADR-025 Accepted
- [x] README updated
- [x] Certification updated
- [x] Changelog updated
- [x] Release notes updated
- [x] Release document created
- [x] Tests passing (1326)
- [x] No SDK behaviour changes
- [x] No flag changes
- [x] Rollback documented

---

## Certification Checklist

- [x] Architecture compliant
- [x] Public API unchanged
- [x] PricingSDK frozen
- [x] Backward compatible
- [x] Provider neutral
- [x] Feature flags unchanged
- [x] Production routing unchanged
- [x] Rollback safe
- [x] Documentation complete

---

**STOP — M8 PR-16 (Unified Commerce Platform v1.0 Certification) requires explicit ARB approval.**

# M2 Risk Assessment — OrderBhojan Location Intelligence

**Date:** 2026-06-26  
**Status:** Planning complete  
**Extends:** `docs/m2/RISK-ASSESSMENT.md` (BhojanOS backend)

---

## Risk Matrix

| ID | Risk | L | I | Mitigation | Owner |
|----|------|---|---|------------|-------|
| OB-R01 | Client calls geocoder directly (ToS/CORS) | High | High | ESLint boundary test; ADR-OB-004; code review | ARB |
| OB-R02 | MapLibre blows bundle budget | Med | High | Lazy load; `FF_LOCATION_MAP_ENABLED`; perf gate | Performance |
| OB-R03 | GPS denied — dead end UX | Med | Med | Manual address always available; DRB flow | DRB |
| OB-R04 | Guest location PII in localStorage | Low | Med | Schema allows coords+label only; no phone | Security |
| OB-R05 | Firestore address rules too permissive | Low | High | M1 rules unchanged; Security review at impl | Security |
| OB-R06 | India reference data incomplete | High | Med | State-by-state ship; fallback warning (aligns R-06) | Location |
| OB-R07 | M2 accidentally calls discover/search | Med | High | `gate:m2` boundary test; ARB scope | Testing |
| OB-R08 | Location module breaks M1.6 regression | Med | High | Flags OFF default; full gate chain | Release Mgr |
| OB-R09 | Backend location API not ready — MSW drift | Med | Med | Contract tests; OpenAPI sync in M2 impl phase | Marketplace API |
| OB-R10 | Duplicate address models vs BhojanOS | Med | Med | Single `IndiaAddress` DTO aligned with backend doc | ARB |
| OB-R11 | Map pin accessibility gap | Med | Med | Manual confirm step; a11y review mandatory | Accessibility |
| OB-R12 | Cross-product nav inconsistency | Low | Med | Ecosystem Guardian scorecard | Guardian |
| OB-R13 | Invalid coords (0,0) saved | Med | High | Zod validation; reject null island | Location |
| OB-R14 | Feature flag left ON in prod early | Low | High | Release checklist; DevOps env review | DevOps |

---

## Architectural Risks

### A-OB-01: Premature M3 coupling

**Risk:** Location module imports discovery hooks.

**Mitigation:** `locationSessionStore` exposes read-only selector; no marketplace-api discover imports in `features/location/`.

### A-OB-02: OrderBhojan UI owns too much location logic

**Risk:** Address form built in experience module.

**Mitigation:** All location code under `features/location/`; UI agent only wires header chip.

### A-OB-03: BhojanOS SDK import

**Risk:** Developer imports `@/sdk/location` from BhojanOS.

**Mitigation:** Architecture test — OrderBhojan must not import root `src/`; ESLint import guard.

---

## Security Risks

| Risk | Mitigation |
|------|------------|
| Address PII leakage to analytics | Telemetry scrubbing — no street in events |
| Geolocation permission fatigue | Ask on first chip tap, not app load |
| XSS via formattedAddress | Sanitize display; React text nodes only |

---

## Operational Risks

| Risk | Mitigation |
|------|------------|
| MSW left enabled in prod | `import.meta.env.PROD` guard — existing M0 pattern |
| Stale guest location | TTL 7 days in localStorage; prompt refresh |

---

## Rollback

All flags OFF → instant revert to M1.6. Firestore addresses inert. See [ROLLOUT-STRATEGY.md](./ROLLOUT-STRATEGY.md).

---

## Go / No-Go (Implementation — future)

| Criterion | Required |
|-----------|----------|
| ARB planning package GO | ✓ |
| DRB UX GO | ✓ |
| ADR-OB-004 accepted | ✓ |
| API contract reviewed | ✓ |
| CEO implementation approval | Pending |

---

*QRB review at implementation phase*

# Pricing Governance v1.0

**Status:** Frozen — M8 PR-14  
**Date:** 2026-07-03

---

## 1. Governance model

| Role | Responsibility |
|------|----------------|
| **Architecture Review Board (ARB)** | Accept ADR-025, approve metadata promotion (PR-15), approve production activation |
| **Platform team** | Maintain SDK contracts, documentation, test suite |
| **Operations** | Flag management, staging soak, rollback execution |

---

## 2. Change control

| Change type | Requirement |
|-------------|-------------|
| Breaking API change | New ADR + major version bump |
| New public method | ADR + minor version (post-freeze) |
| Wiring adapter into PricingSDK | Separate ADR + ARB approval |
| Production flag enablement | PR-13 certification + ARB sign-off |
| Firestore migration | Future ADR (out of scope v1.0) |
| Version constant promotion | M8 PR-15 after ADR-025 Accepted |

---

## 3. ADR status

| ADR | Title | Status |
|-----|-------|--------|
| ADR-025 | Pricing Platform v1.0 Freeze | **Proposed** (not Accepted) |

ADR-025 must be **Accepted** before M8 PR-15 metadata promotion.

---

## 4. Certification governance

- PR-13 switch certification produces GO/NO-GO decision packages
- Every package includes `legacyAuthoritative: true`
- Every package includes `productionActivationProhibited: true`
- Production activation is a **separate** governed step from v1.0 freeze

---

## 5. Feature flag governance

- All 11 flags default OFF in production
- Staging enablement follows documented sequence
- Rollback ordering documented in compatibility matrix
- No automatic flag promotion

---

## 6. Documentation governance

| Artifact | Owner | Review cycle |
|----------|-------|--------------|
| v1.0 pack (`docs/m8/v1.0/`) | Platform team | Per PR |
| ADR-025 | ARB | On acceptance |
| PR reports (`docs/m8/PR-*`) | Platform team | Per milestone |

---

## 7. Freeze scope (v1.0 documentation)

**Frozen (documentation):**
- `PricingSDK` 8-method contract
- `PricingRepository` port
- `PricingFacade` presentation surface
- All DTOs in `src/sdk/pricing/dto/`
- 11 feature flag names and defaults

**Not frozen (runtime until PR-15):**
- `PRICING_SDK_VERSION` constant
- `PRICING_SDK_FROZEN` constant

---

**STOP.** PR-15 blocked until ADR-025 Accepted.

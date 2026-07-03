# Pricing Risk Assessment v1.0

**Status:** Frozen — M8 PR-14  
**Date:** 2026-07-03

---

## 1. Architecture risk

| Risk | Likelihood | Impact | Mitigation | Residual |
|------|------------|--------|------------|----------|
| Accidental adapter wiring into PricingSDK | Low | High | Not wired; no integration tests; code review | Low |
| DTO contract drift | Low | High | Documentation freeze; ADR-025 governance | Low |
| Cross-platform coupling | Low | Medium | M1–M7 untouched; no imports | Low |
| Domain purity violation | Low | Medium | Pure domain tests; no SDK imports in domain | Low |

**Architecture risk: LOW**

---

## 2. Operational risk

| Risk | Likelihood | Impact | Mitigation | Residual |
|------|------------|--------|------------|----------|
| Flags accidentally enabled in production | Medium | High | All default OFF; L1 rollback < 1 min | Medium |
| No production soak evidence | High | Medium | Staging soak required pre-activation | Medium |
| Missing observability dashboards | High | Low | Telemetry documented; hooks available | Medium |
| Rollout without manual approval | Low | High | Promotion requires manual approval gate | Low |

**Operational risk: MEDIUM**

---

## 3. Production risk

| Risk | Likelihood | Impact | Mitigation | Residual |
|------|------------|--------|------------|----------|
| Production routing via projection | None (v1.0) | Critical | Adapter not wired; certification prohibits activation | None |
| Incorrect pricing calculations | N/A | Critical | No calculations implemented; `NOT_CONFIGURED` | N/A |
| Firestore data corruption | None (v1.0) | High | No Firestore integration | None |
| GST/compliance errors | N/A | Critical | Tax engine not implemented | N/A |

**Production risk: LOW** (no production pricing enabled)

---

## 4. Migration risk

| Risk | Likelihood | Impact | Mitigation | Residual |
|------|------------|--------|------------|----------|
| Premature metadata promotion | Low | Medium | PR-15 blocked until ADR-025 Accepted | Low |
| Breaking frozen platforms during integration | Medium | High | Separate ADRs per integration | Medium |
| Projection read switch without certification | Low | Critical | PR-13 GO/NO-GO required | Low |
| Version constant mismatch (doc vs runtime) | Medium | Low | Documented; PR-15 resolves | Low |

**Migration risk: MEDIUM**

---

## 5. Overall certification risk

| Category | Rating |
|----------|--------|
| Architecture | LOW |
| Operational | MEDIUM |
| Production | LOW |
| Migration | MEDIUM |
| **Overall** | **LOW–MEDIUM** |

**Certification verdict: CONDITIONAL GO**

- **GO** for documentation freeze and ARB review
- **NO GO** for production activation until PR-15, staging soak, and explicit rollout approval

---

## 6. Risk acceptance (ARB)

| Accepted risk | Rationale |
|---------------|-----------|
| Runtime metadata at `0.1.0-foundation` until PR-15 | Consistent with Menu/Branch pattern |
| Standalone infrastructure not usable via PricingSDK | Intentional; staging evidence only |
| No production soak | Parallel track with staging |
| Catalog-metadata projection only | Sufficient for shadow evidence chain |

---

**STOP.** Production activation prohibited.

# Pricing Migration Roadmap v1.0

**Status:** Frozen — M8 PR-14  
**Date:** 2026-07-03

---

## 1. Milestone timeline

| Phase | PR | Status | Deliverable |
|-------|-----|--------|-------------|
| Foundation | PR-1–PR-5 | ✅ Complete | SDK, domain, repository, orchestration, facade |
| Projection | PR-6–PR-7 | ✅ Complete | Foundation + shadow catalog projection |
| Evidence | PR-8–PR-10 | ✅ Complete | Parity, soak, operational validation |
| Read switch prep | PR-11–PR-13 | ✅ Complete | Adapter, rollout, switch certification |
| v1.0 freeze | PR-14 | ✅ Complete | Documentation + governance pack |
| Metadata promotion | PR-15 | 🔒 Blocked | Version constants → `1.0.0` / `true` |
| Production activation | Future | 🔒 Blocked | Staging soak + ARB approval |

---

## 2. Post-freeze roadmap

### M8 PR-15 — Metadata Promotion (blocked)

- Promote `PRICING_SDK_VERSION` to `1.0.0`
- Set `PRICING_SDK_FROZEN = true`
- Update foundation tests
- Git tag `pricing-platform-v1.0`

### Future — Adapter wiring (requires ADR)

- Wire `PricingReadAdapter` into orchestration path
- Staging-only initially
- Requires PR-13 certification `READY`

### Future — Production rollout (requires ADR)

- Enable rollout stages 1→5 with manual promotion
- 72h staging soak per stage
- Parity ≥ 99% maintained

### Future — Firestore migration (requires ADR)

- Migrate price lists to Firestore collections
- Provider implementation behind repository port
- No DTO changes

---

## 3. Integration roadmap (frozen platforms)

| Platform | Integration | Status |
|----------|-------------|--------|
| Menu (M7) | Item prices via PricingSDK | Future ADR |
| Order (M6) | Checkout pricing | Future ADR |
| Event (M6) | Pricing events | Future ADR |
| Checkout UI | PricingFacade | Future presentation PR |

**M1–M7 remain untouched in M8.**

---

## 4. Dependencies

```
PR-14 (doc freeze)
    ↓ ARB accepts ADR-025
PR-15 (metadata promotion)
    ↓ Staging soak
PR-13 certification READY
    ↓ ARB production approval
Production activation (future)
```

---

**STOP.** Do not begin PR-15 without ARB approval.

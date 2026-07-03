# GA-1 Deployment Report — Legacy Production

**Program:** BhojanOS SaaS  
**Milestone:** GA-1 — Production Deployment (Legacy Read Path)  
**Date:** 2026-07-03  
**Status:** Ready for deployment execution

---

## Executive Summary

GA-1 establishes the **first production deployment** of BhojanOS on the **legacy architecture only**. Projection, adapter, rollout, and certification infrastructure remains dormant. Automated verification ensures 28 projection flags stay OFF.

---

## Architecture Validation

| Constraint | Status |
|------------|--------|
| Legacy Firestore authoritative | ✓ |
| Projection disabled | ✓ |
| Adapter not wired | ✓ |
| Rollout not active | ✓ |
| Certification not active | ✓ |
| Event platform dormant | ✓ |
| SDK APIs unchanged | ✓ |
| No schema migration | ✓ |
| No K8s/Terraform deployed | ✓ |

---

## Deliverables

| Artifact | Path |
|----------|------|
| Deployment runbook | `docs/ga-1/GA-1-LEGACY-PRODUCTION-DEPLOYMENT.md` |
| Flag manifest | `scripts/flags/ga1-production-flags.json` |
| Flag verifier | `scripts/ga1/verify-production-legacy-flags.mjs` |
| Pre-deploy gate | `scripts/ga1/pre-deploy-gate.mjs` |
| Quality gates | `docs/ga-1/QUALITY-GATES.md` |
| Rollback | `docs/ga-1/ROLLBACK.md` |

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Production impact from GA-1 | None | Documentation + verification only |
| Runtime behaviour change | None | No SDK code changes |
| Projection accidental enable | Low | `verify:ga1-flags` gate |
| API change | None | Legacy path unchanged |
| Flag change | None | Manifest enforced |
| Regression risk | Low | 1326 tests + pre-deploy gate |

**Overall risk: LOW**

---

## Testing Summary

| Suite | Expected |
|-------|----------|
| `npm run test:sdk` | 1326 / 1326 |
| `npm run test:security` | All pass |
| `npm run build:web` | Success |
| `npm run build:server` | Success |
| `npm run verify:ga1-flags` | 28 flags OFF |

---

## Definition of Done

- [x] GA-1 documentation complete
- [x] Flag manifest (28 forbidden projection flags)
- [x] Automated flag verification script
- [x] Pre-deploy quality gate script
- [x] Rollback documented (L1–L4)
- [x] Legacy architecture runbook
- [ ] Production deployed (execute runbook)
- [ ] Post-deploy verification complete
- [ ] 24h monitoring window started

---

## Certification Checklist

- [x] Architecture compliant (legacy only)
- [x] Projection infrastructure dormant
- [x] Feature flag guard operational
- [x] SDK tests passing
- [x] Build verified (`build:web` + `build:server`, gate passed locally)
- [x] Rollback safe
- [x] Documentation complete

---

## Deployment Execution

Execute per [GA-1-LEGACY-PRODUCTION-DEPLOYMENT.md](./GA-1-LEGACY-PRODUCTION-DEPLOYMENT.md):

```bash
npm run gate:ga1
git push origin main
firebase deploy --only firestore:rules --project bhojanos-prod
```

---

**STOP.** Do not begin projection activation, adapter wiring, rollout stages, or Kubernetes migration until real production usage validation and ARB approval.

# M2 Quality Gates — Location Intelligence Platform

**Aligns with:** [docs/milestone-quality-matrix.md](../../../docs/milestone-quality-matrix.md)

---

## Planning Phase Gates (This Milestone)

| Gate | Owner | Reviewer | Exit Criteria | Status |
|------|-------|----------|---------------|--------|
| **Architecture** | ARB (02) | CEO | ARCHITECTURE-REPORT approved; boundaries clear; ADR-OB-004 | **PASS** |
| **Design** | DRB (03) | Exp Evolution (18) | DESIGN-REVIEW GO; BDS-only plan | **PASS** |
| **API contracts** | ARB (02) | Marketplace API (08) | API-CONTRACTS-M2 reviewed; no client geocoder | **PASS** |
| **Risk assessment** | PM (01) | ARB, Security | RISK-ASSESSMENT complete | **PASS** |
| **Documentation** | Documentation (14) | PM, Release Mgr | Full m2 doc pack | **PASS** |
| **Release** | Release Mgr (17) | CEO | Planning STOP acknowledged | **PASS** |

---

## Implementation Phase Gates (Future)

| Gate | Owner | Reviewer | Exit Criteria |
|------|-------|----------|---------------|
| **Architecture** | ARB | — | Module layout matches report; boundary tests pass |
| **Design** | DRB | Guardian (19) | Visual review; chip + sheets; dark mode |
| **Performance** | Performance (10) | QRB | Bundle ≤ budget; lazy map chunk |
| **Accessibility** | Accessibility (11) | DRB | WCAG AA; permission sheet |
| **Security** | Security (16) | Firebase (09) | Rules unchanged or reviewed; no PII leak |
| **Testing** | Testing (13) | QRB | `gate:m2` + regression |
| **Documentation** | Documentation (14) | Release Mgr | MIGRATION-NOTES, RELEASE-NOTES |
| **Release** | Release Manager (17) | CEO | Version `0.4.0-m2`; STOP |

---

## gate:m2 Definition (Future Implementation)

```bash
npm run gate:m2
```

Planned checks:

1. `lint` + `test` + `build`
2. Version string `m2` in package.json
3. `features/location/` structure exists
4. No imports from `discover`, `checkout`, `cart` in location module
5. No `nominatim` or `googleapis` strings in client src
6. `FF_LOCATION_ENABLED` default false in flags.ts
7. Regression: `gate:m16`, `gate:m15`, `gate:m1`, `gate:m0`
8. Required docs in `docs/m2/`

---

## Success Metrics Report (Required at Implementation Closeout)

| Metric | Owner |
|--------|-------|
| Build | DevOps |
| Tests (count) | Testing |
| Coverage delta | Testing |
| Lighthouse mobile | Performance |
| Accessibility checklist | Accessibility |
| Visual consistency | DRB + Exp Evolution |
| Bundle size delta KB | Performance |
| BDS compliance % | Ecosystem Guardian |
| Cross-product consistency | Ecosystem Guardian |

Template: [.cursor/templates/milestone-closeout-report.md](../../../.cursor/templates/milestone-closeout-report.md)

---

*Planning quality gates: ALL PASS — 2026-06-26*

# GA-2 Quality Gates

---

## Pre-Release Gates

| # | Gate | Command | Expected |
|---|------|---------|----------|
| G1 | GA-1 flags OFF | `npm run verify:ga1-flags` | 28 flags OFF |
| G2 | GA-2 artifacts | `npm run verify:ga2` | All present |
| G3 | SDK + security tests | `npm run test:security` | All pass |
| G4 | Frontend build | `npm run build:web` | Success |
| G5 | API build | `npm run build:server` | Success |

**Combined:** `npm run gate:ga2`

---

## Onboarding Gates (manual)

See [ONBOARDING-CHECKLIST.md](./ONBOARDING-CHECKLIST.md).

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Storefront LCP | < 3s on 4G |
| Menu API read | < 500ms |
| Checkout place order | < 2s |
| Owner dashboard load | < 4s |

---

## Regression Protection

| Risk | Mitigation |
|------|------------|
| Projection accidentally enabled | `verify:ga1-flags` in gate:ga2 |
| Guest tracking blocked | `/order/:orderId` public route |
| Dashboard metrics stale | Realtime Firestore `orders` listener |
| Cross-tenant leak | `test:rules` + manual isolation check |

---

## Success Criteria

- [ ] `gate:ga2` passes in CI
- [ ] First production order end-to-end
- [ ] 7 days without critical incidents
- [ ] Daily backup export verified

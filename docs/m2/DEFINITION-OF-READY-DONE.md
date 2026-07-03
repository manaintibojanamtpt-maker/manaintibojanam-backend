# M2 — Definition of Ready & Definition of Done

---

## Definition of Ready (DoR)

A PR may enter implementation when **all** items applicable to that PR are satisfied.

### Program-level (before PR-2)

- [ ] M2 design pack reviewed and approved by Architecture Review Board
- [ ] No conflict with FEB-001 architecture freeze
- [ ] OrderSDK v1.0.0 remains untouched (ADR-013)
- [ ] Nominatim usage strategy decided (public proxy vs self-hosted)
- [ ] India reference data source identified (license, update cadence)
- [ ] Feature flag naming convention agreed (`FF_SDK_LOCATION_*`)
- [ ] PR sequence acknowledged (no skipping PR-2 before PR-1 sign-off)

### Per-PR DoR

| PR | Additional ready criteria |
|----|---------------------------|
| PR-2 | LocationSDK design approved; SdkResult pattern confirmed |
| PR-3 | India Address Model schema approved; initial state list scope defined |
| PR-4 | MapLibre tile source URL approved; bundle budget agreed (<150KB gzip lazy) |
| PR-5 | Owner UX mock approved; validation rules signed off |
| PR-6 | Nominatim adapter port interface approved; facade pattern matches OrderSDK |
| PR-7 | Firestore schema proposal approved (read paths); geoIndex security model agreed |
| PR-8 | Fee parity test vectors documented from `deliveryFee.ts` |
| PR-9 | Test coverage targets agreed |
| PR-10 | Documentation template matches OrderSDK v1.0 pack |

### Story-level DoR

- [ ] Acceptance criteria written
- [ ] Feature flag identified with default OFF
- [ ] Rollback path documented in PR description
- [ ] No Checkout write path changes (unless explicit ADR)
- [ ] No Firestore migration (unless PR explicitly scoped with migration ADR)

---

## Definition of Done (DoD)

A PR is **done** when all applicable items are complete.

### Code DoD

- [ ] Implements only scoped PR deliverables
- [ ] Follows ADR-011 strangler pattern
- [ ] Presentation uses SDK/facade — no direct Nominatim in components (PR-6+)
- [ ] `SdkResult` at SDK boundary — no unhandled throws
- [ ] Feature flag default OFF; env var documented in `.env.example`
- [ ] No modifications to OrderSDK frozen surface
- [ ] No modifications to Checkout order creation/write paths
- [ ] Lint passes (`npm run lint:presentation` if presentation touched)

### Test DoD

| PR | Test requirement |
|----|------------------|
| PR-2 | SDK contract type tests |
| PR-3 | Address validation unit tests (all V-01–V-10 rules) |
| PR-4 | MapPinPicker smoke test (mount + pin drag) |
| PR-5 | Form validation integration test |
| PR-6 | Facade parity vs legacy AutoLocationForm |
| PR-7 | Discovery distance sort unit tests |
| PR-8 | **100% fee parity** golden tests vs `deliveryFee.ts` |
| PR-9 | `npm run test:location` in CI; all pass |
| PR-10 | Docs reviewed; links valid |

### Documentation DoD

- [ ] PR report in `docs/m2/PR-N-*.md`
- [ ] Feature flag documented
- [ ] Rollback steps in PR report
- [ ] ADR reference if contract changes

### Deployment DoD

- [ ] Deployable independently (no dependency on unreleased PRs except stated)
- [ ] Staging verified with flag ON
- [ ] Rollback verified (flag OFF restores legacy behavior)
- [ ] No customer-visible change with flags default OFF

### Program-level DoD (M2 complete)

- [ ] PR-1 through PR-10 merged
- [ ] LocationSDK API reference published
- [ ] ADR-014 (Location Platform) accepted
- [ ] 72h staging soak with all location flags ON
- [ ] Risk items R-01, R-03, R-04 mitigated
- [ ] ServiceabilityService dead code removed
- [ ] Migration ADR drafted (Firestore backfill — separate milestone)

---

## Explicit Non-Goals (DoD exclusion)

These are **not** required for M2 program completion:

- Firestore data migration executed
- Multi-branch writes enabled
- Marketplace production launch
- Valhalla / PostGIS / Redis implementation
- OrderSDK changes
- Checkout migration

---

*Definition of Ready / Done — M2 Location Intelligence Platform.*

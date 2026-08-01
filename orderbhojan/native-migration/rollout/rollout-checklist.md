# Native route rollout checklist

## Pre-release
- [ ] Package/bundle ID unchanged
- [ ] Release signing keystore / Apple team available
- [ ] Route contract reviewed
- [ ] Analytics events wired + verified in debug
- [ ] Hybrid fallback path manually tested
- [ ] Kill switch defaults OFF in prod config
- [ ] Internal cohort list set

## Gates
| Gate | Who | Pass criteria |
|------|-----|---------------|
| Dev | Eng | Unit + UI tests green |
| Staging | QA | Track happy path + guest track + push open |
| Internal dogfood | Product/eng | 48h no P0; fallback works |
| Play internal / TestFlight | QA | Crash-free ≥ 99% sessions |
| Prod 1% | Coordinator | Error rate ≤ hybrid baseline |
| Ramp | Coordinator | Monitor each step 24–72h |

## Rollback
1. Set `FF_NATIVE_TRACK=false` (or master `FF_NATIVE_HOST=false`) remotely / next build.
2. Users immediately see hybrid WebView for track.
3. Do **not** yank store binary unless crash loop.
4. File incident with correlation IDs from `/api/client-errors`.

## Abort signals
- Crash rate > hybrid + 0.5pp
- Track screen blank / infinite loading > 2%
- Auth token failures spike
- Deep link opens wrong surface

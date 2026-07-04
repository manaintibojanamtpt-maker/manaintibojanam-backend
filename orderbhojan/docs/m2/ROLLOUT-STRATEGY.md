# M2 Rollout Strategy — Location Intelligence

**Status:** Planning  
**Owner:** Release Manager (17) + Product Manager (01)

---

## Phases

### Phase 0 — Planning (Current)

- Executive Board produces approval package
- **STOP** — no engineering agents

### Phase 1 — Foundation (Implementation — future)

**Agents:** 07 Location Platform, 13 Testing, 09 Firebase (review)

| Deliverable | Flag |
|-------------|------|
| Domain types + Zod schemas | OFF |
| locationSessionStore + guest localStorage | OFF |
| Location chip UI (static "Set location") | `FF_LOCATION_ENABLED` |
| Unit tests + `gate:m2` skeleton | OFF |
| MSW handlers (no prod calls) | OFF |

**Exit:** `gate:m2` pass with flags OFF; M1.6 regression green.

### Phase 2 — GPS + Session

| Deliverable | Flag |
|-------------|------|
| Geolocation permission flow | ON in dev/staging |
| Reverse geocode via MSW | `FF_LOCATION_GEOCODE_API` |
| Header chip live label | ON staging |

**Exit:** DRB + Accessibility sign-off on permission UX.

### Phase 3 — Saved Addresses

| Deliverable | Flag |
|-------------|------|
| Firestore address CRUD | ON staging |
| Address form + validation | ON staging |
| Profile → saved addresses link | ON staging |

**Exit:** Security review on Firestore usage.

### Phase 4 — Map Pin (Optional split)

| Deliverable | Flag |
|-------------|------|
| Lazy MapLibre MapPinPicker | `FF_LOCATION_MAP_ENABLED` |
| Performance smoke with lazy chunk | ON staging |

**Exit:** Bundle increment ≤ 200 KB gzip on lazy path.

### Phase 5 — Backend Integration

**Agents:** 08 Marketplace API (BhojanOS server — separate approval)

| Deliverable | Flag |
|-------------|------|
| Live reverse geocode endpoint | Staging backend |
| Replace MSW with live client | Staging only |

**Exit:** Contract tests pass against staging.

### Phase 6 — Production

| Step | Owner |
|------|-------|
| QRB full gate | Release Manager |
| Ecosystem Guardian scorecard | Agent 19 |
| Enable `FF_LOCATION_ENABLED` prod | CEO + Release Manager |
| Monitor GPS grant rate 48h | PM |

---

## Environment Matrix

| Env | FF_LOCATION | FF_GEOCODE_API | FF_MAP | API |
|-----|-------------|----------------|--------|-----|
| Local dev | ON | MSW | ON | MSW |
| Staging | ON | MSW → live | ON | Staging Render |
| Production | OFF → ON | OFF → live | OFF → ON | Production Render |

---

## Rollback Plan

1. Set all location flags OFF in env config
2. Redeploy previous tag (`orderbhojan-v0.3.6-m16` or last green)
3. Verify M1.6 shell unchanged
4. Firestore addresses remain — no data loss
5. Document incident if prod rollback

Target rollback time: **< 15 minutes**

---

## Dependencies on BhojanOS Backend

| Backend capability | OrderBhojan need | Blocker? |
|--------------------|------------------|----------|
| Location SDK reverse geocode | API proxy | Phase 5 — MSW unblocks Phases 1–4 |
| Branch serviceability | Preview message | Optional in M2 — mock OK |
| Reference data API | Optional | Client bundle default |

**M2 can ship client-only with MSW** if backend delayed — ARB approved.

---

## Success Metrics (Post-Launch)

| Metric | Target |
|--------|--------|
| GPS permission grant rate | ≥ 60% |
| Address save completion (auth) | ≥ 75% |
| Location module bundle (lazy map not loaded) | ≤ +80 KB |
| M1.6 regression | 100% pass |
| P0 location incidents | 0 |

---

*See [.cursor/checklists/release-checklist.md](../../../.cursor/checklists/release-checklist.md)*

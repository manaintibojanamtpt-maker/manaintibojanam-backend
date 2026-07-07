# Rollback Checklist

**BAEO v1.1** — Owner: Release Manager (17) · Activate when deploy fails or P0 detected post-release

---

## Trigger Conditions

- [ ] Production/staging error rate spike
- [ ] Auth or payment flow broken
- [ ] Bundle fails to load (404/500 on assets)
- [ ] Data integrity issue
- [ ] Security incident

## Immediate (T+0 — 15 min)

- [ ] Release Manager declares rollback
- [ ] Identify previous stable tag: `orderbhojan-v____`
- [ ] DevOps notified
- [ ] ERB engaged if P0
- [ ] Stop further deploys / feature flag kill if available

## Execute Rollback (T+15 — 30 min)

- [ ] Redeploy previous tag to affected environment
- [ ] Verify smoke: app loads, auth works, primary route OK
- [ ] Confirm error rate normalized
- [ ] Document rollback time: ___ minutes (target < 15)

## Post-Rollback (T+30 min — 48 h)

- [ ] Incident log started (Documentation agent)
- [ ] Root cause assigned to owning agent
- [ ] Forward fix branch created (not on prod until gated)
- [ ] ROLLBACK-PLAN.md updated with lessons
- [ ] Post-mortem scheduled within 48h
- [ ] CEO notified if customer-facing P0

## Rollback Verification

| Check | Pass |
|-------|------|
| Previous version live | |
| Gate pass on rolled-back tag | |
| No data migration required (or migration reversed) | |
| Stakeholders notified | |

## Sign-Off

| Role | Agent | Time |
|------|-------|------|
| Release Manager | 17 | |
| DevOps | 15 | |
| Security (if auth/data) | 16 | |

# Hourly Checklist — 72-Hour Soak

**Program ID:** BHOS-STAGING-SOAK-001  
**Execution ID:** EXEC-002  
**Use during:** Phase 7 only

---

## Hour ___ of 72 | UTC: __________ | Operator: __________

### 1. Service health (5 min)

- [ ] All pods Running: `kubectl get pods -n bhojanos-staging-spine`
- [ ] API `/health/live` → 200
- [ ] Order worker `/health/projection` → 200, checkpoint age ≤60s
- [ ] Menu worker `/health/projection` → 200, snapshot age ≤60s
- [ ] Outbox `/health/ready` → 200
- [ ] Replay `/health/ready` → 200

### 2. Metrics snapshot (5 min)

| Metric | Value | GREEN? |
|--------|-------|--------|
| `order_parity_match_rate` (primary avg) | ___% | ≥99.9 |
| `menu_parity_match_rate` (primary avg) | ___% | ≥99.9 |
| `projection_lag_ms` p99 | ___ms | ≤30000 |
| `outbox_depth` max | ___ | <500 |
| `projection_checkpoint_age_ms` | ___ms | ≤60000 |
| `prod_spine_flags_enabled_count` (prod) | ___ | 0 |

### 3. Alerts (2 min)

- [ ] No unacknowledged CRITICAL alerts
- [ ] No firing `ParityBelow97`
- [ ] No firing `ProdSpineFlagOn`

### 4. Control tenants (3 min)

- [ ] `soak-control-001` legacy order read → success
- [ ] `soak-control-002` legacy menu read → success
- [ ] No projection writes on control tenants

### 5. Evidence (5 min)

- [ ] Export hourly metrics CSV to `gs://bhojanos-staging-evidence/EXEC-002/hourly/H___/`
- [ ] Log any AMBER conditions with ticket reference

### Escalation triggers (immediate)

| Condition | Action |
|-----------|--------|
| Parity <97% for 10m | P2 → pause soak clock, notify Architect |
| Lag >5m | P2 → SRE investigation |
| Outbox >1000 for 5m | P2 → scale outbox |
| Prod spine flag ON | P1 → L1 + page prod ops |
| Worker total failure | P1 → L1 + incident |

**Sign-off:** _________________ **Time:** _________ UTC

# Daily Operations Checklist — Soak Window

**Program ID:** BHOS-STAGING-SOAK-001  
**Execution ID:** EXEC-002  
**Day ___ of 3 | Date: __________**

---

## Morning review (08:00 UTC)

### Infrastructure

- [ ] GKE nodes healthy (3/3 Ready)
- [ ] No pod restart storm (>3 restarts/hour any deployment)
- [ ] Disk usage Prometheus PVC <80%
- [ ] Secret Manager — no expiry within 7 days unplanned

### Soak metrics (24h rolling)

| Metric | Day target | Actual | Status |
|--------|------------|--------|--------|
| Order parity avg | ≥99.9% | | |
| Menu parity avg | ≥99.9% | | |
| Order worker uptime | ≥99.5% | | |
| Menu worker uptime | ≥99% | | |
| Max lag observed | ≤30s | | |
| Replay success | ≥99% | | |
| Incidents (P1/P2) | 0 / ≤2 | | |

### Evidence collection

- [ ] 6× hourly exports archived (00–06 UTC block)
- [ ] Parity report (4h sample) → `parity/day-___.json`
- [ ] Checkpoint export → `checkpoints/day-___.json`
- [ ] Grafana dashboard screenshots (spine-overview, parity-soak, replay-lag)
- [ ] Daily ops meeting notes uploaded to GCS

### Rollback readiness

- [ ] L1 script tested (tabletop or live dry-run)
- [ ] Last known-good deploy SHA documented
- [ ] T-0 / latest checkpoint export verified restorable

---

## Afternoon review (16:00 UTC)

- [ ] Repeat morning metrics for 08–16 UTC block
- [ ] Review all AMBER conditions — mitigation status
- [ ] Confirm soak clock uninterrupted (note any pauses)
- [ ] Update [STAGING-CHECKLIST.md](../m6-m7-unified-soak/STAGING-CHECKLIST.md) daily section
- [ ] Slack summary to #bhojanos-staging-ops

---

## End of day (23:59 UTC)

- [ ] 24h evidence bundle complete for day ___
- [ ] Handoff notes for next on-call
- [ ] No open P1 incidents
- [ ] Prod flag guard: 24h log shows 0 enabled

**Platform Ops Lead sign-off:** _________________  
**SRE on-call sign-off:** _________________

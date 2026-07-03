# Escalation Matrix

**Document ID:** BHOS-OPS-ESC-001

---

## Contact matrix

| Role | Responsibility | Primary | Backup | Hours |
|------|----------------|---------|--------|-------|
| Platform Ops Lead | Deploy, flags, tenants | ops-lead@bhojanos.com | — | Soak window 24/7 |
| SRE On-call | Metrics, incidents, rollback | PagerDuty staging | SRE lead | 24/7 during Phase 7 |
| Platform Architect | Adapter gates, P1 decisions | architect@bhojanos.com | — | Business hours + P1 |
| ARB Chair | GO-NO-GO, certification | arb@bhojanos.com | — | Phase 10 + P1 |
| Security | IAM, secrets, prod guard | security@bhojanos.com | — | P1 prod flag |
| Business Sponsor | Sign-off | sponsor@bhojanos.com | — | Phase 10 only |

---

## Escalation paths

| Trigger | L1 response | L2 (30m) | L3 (1h) | L4 (P1 immediate) |
|---------|-------------|----------|---------|-------------------|
| Parity <97% 10m | SRE on-call | Platform Ops Lead | Platform Architect | ARB if <95% |
| Lag >5m 15m | SRE on-call | Platform Ops Lead | Platform Architect | — |
| Worker down >5m | SRE on-call | Platform Ops Lead | L1 auto-consider | Architect if data risk |
| Prod flag ON | SRE + Security | Prod ops + Architect | ARB Chair | Executive notify |
| Soak pause >4h | Platform Ops Lead | Platform Architect | ARB Chair | Business Sponsor |
| L1 fails (>60s) | SRE | Platform Ops Lead | L2/L3 | Architect |
| Evidence gap | Platform Ops | SRE | Architect | ARB (Phase 10 block) |

---

## Channel routing

| Severity | Slack | PagerDuty | Email |
|----------|-------|-----------|-------|
| P1 | #bhojanos-staging-alerts + @channel | Staging service | ops-lead + architect |
| P2 | #bhojanos-staging-alerts | Optional | ops-lead |
| P3 | #bhojanos-staging-alerts | No | — |
| P4 | #bhojanos-staging-ops | No | — |

---

## ARB escalation criteria

Escalate to ARB Chair when:

- Any P1 incident during soak
- Soak paused >4 hours
- Parity <95% at any point
- L4 rollback required
- Production guard triggered
- Business sign-off blocked

---

## De-escalation

Resume soak only when:

1. Root cause documented
2. Metrics GREEN for 30m (or AMBER with Architect approval)
3. L1 validation pass if rollback executed
4. ARB notification for P1 (approval to resume)

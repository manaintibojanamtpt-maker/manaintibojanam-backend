# SRE Operations Guide — BhojanOS Staging

**Document ID:** BHOS-IAC-SRE-001

## Daily checks (during 72h soak)

| Time | Action | Dashboard |
|------|--------|-----------|
| 00:00, 08:00, 16:00 UTC | Review spine-overview | Flags, soak timer, health score |
| Every 4h | Parity sample | parity-soak |
| Every 6h | Checkpoint export | `scripts/backup/checkpoint-export.sh` |
| Every 15m (automated) | Prod flag guard | prod_spine_flags_enabled_count |

## SLIs / SLOs (staging soak)

| SLI | SLO | Alert threshold |
|-----|-----|-----------------|
| Order projection uptime | 99.9% / 72h | <99% for 15m |
| Menu projection uptime | 99.9% / 72h | <99% for 15m |
| Parity match rate | 99.9% | <97% for 10m |
| Projection lag p99 | <30s | >30s for 5m |
| Replay success rate | ≥99% | <99% for 15m |
| Outbox depth | <1000 | >1000 for 5m |

## On-call escalation

1. **P3** — Warning alerts → #bhojanos-staging-alerts
2. **P2** — Parity/lag degradation → SRE + Platform Ops
3. **P1** — Prod flag ON, parity <95%, worker total failure → Platform Architect + ARB

## Correlation ID tracing

```
LogQL: {service="order-projection-worker"} | json | correlationId="<id>"
Tempo: search by correlationId attribute
```

## Metrics export for ARB evidence

```bash
# Snapshot Grafana panels to GCS before each phase gate
bash scripts/backup/dashboard-export.sh
```

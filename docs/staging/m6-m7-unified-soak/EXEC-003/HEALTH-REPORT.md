# EXEC-003 Health Report

**Execution ID:** BHOS-STAGING-SOAK-EXEC-003  
**Date:** 2026-07-03

---

## Health Status Summary

| Layer | Status | Detail |
|-------|--------|--------|
| GCP Project | **DOWN / MISSING** | `bhojanos-staging` not accessible |
| GKE Cluster | **NOT DEPLOYED** | — |
| API | **NOT DEPLOYED** | — |
| Order projection worker | **NOT DEPLOYED** | — |
| Menu projection worker | **NOT DEPLOYED** | — |
| Outbox publisher | **NOT DEPLOYED** | — |
| Replay service | **NOT DEPLOYED** | — |
| Observability stack | **NOT DEPLOYED** | — |

---

## Health Probes

| Probe | Target | Observed |
|-------|--------|----------|
| Liveness `/health/live` | API | **N/A** |
| Readiness `/health/ready` | API | **N/A** |
| Projection `/health/projection` | Workers | **N/A** |
| Prometheus targets UP | All spine | **0 / 0** |
| Grafana dashboards | 7 UIDs | **0 loaded** |

---

## CI Baseline (not staging health)

| Check | Result | Timestamp |
|-------|--------|-----------|
| `npm run test:sdk` | **1033/1033 pass** | 2026-07-03 |

---

## Overall Health Verdict

**NOT HEALTHY** — no staging services exist to probe.

**STOP.**

# Projection Health Report — Staging Soak

**Program ID:** BHOS-STAGING-SOAK-001  
**Execution ID:** BHOS-STAGING-SOAK-EXEC-002  
**Environment:** STAGING ONLY  
**Report status:** **NOT EXECUTED**  
**Report date:** 2026-07-02

---

## 1. Operational health summary

| Dimension | Order (M6) | Menu (M7) | Gate |
|-----------|------------|-----------|------|
| Worker uptime | **N/A** | **N/A** | NOT EXECUTED |
| Checkpoint health | **N/A** | **N/A** | NOT EXECUTED |
| Snapshot creation | **N/A** | **N/A** | NOT EXECUTED |
| Error rate | **N/A** | **N/A** | NOT EXECUTED |
| Throughput | **N/A** | **N/A** | NOT EXECUTED |
| Telemetry completeness | **N/A** | **N/A** | NOT EXECUTED |
| Outbox depth | **N/A** | — | NOT EXECUTED |
| CPU / memory | **N/A** | **N/A** | NOT EXECUTED |

**Overall: NOT EXECUTED**

---

## 2. Worker deployment record

| Service | Planned replicas | Observed | Health probes |
|---------|------------------|----------|---------------|
| order-projection-worker | 2 | **Not deployed** | **N/A** |
| menu-projection-worker | 2 | **Not deployed** | **N/A** |
| outbox-service | 1 | **Not deployed** | **N/A** |
| replay-service | 1 | **Not deployed** | **N/A** |

---

## 3. Certification impact

**NOT_READY**

---

**STOP.**

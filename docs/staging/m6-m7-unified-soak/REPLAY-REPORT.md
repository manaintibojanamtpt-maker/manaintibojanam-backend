# Replay Report — Staging Soak

**Program ID:** BHOS-STAGING-SOAK-001  
**Execution ID:** BHOS-STAGING-SOAK-EXEC-002  
**Environment:** STAGING ONLY  
**Report status:** **NOT EXECUTED**  
**Report date:** 2026-07-02

---

## 1. Executive summary

| Check | Target | Observed | Status |
|-------|--------|----------|--------|
| Replay success rate | ≥ **99%** | **N/A** | NOT EXECUTED |
| Idempotency | **100%** | **N/A** | NOT EXECUTED |
| p95 replay latency | < **500ms** | **N/A** | NOT EXECUTED |
| Checkpoint recovery | < **30s** | **N/A** | NOT EXECUTED |
| Duplicate rate | ≤ **0.5%** | **N/A** | NOT EXECUTED |
| Out-of-order handling | No corruption | **N/A** | NOT EXECUTED |

---

## 2. Execution record

| Step | Planned | Executed |
|------|---------|----------|
| Replay service deployed | Yes | **No** |
| Replay corpus in GCS | 4 corpora | **0** |
| E3 `FF_EVENT_REPLAY_ENABLED` | Yes | **No** |
| Staging replay runs | ≥3 | **0** |

---

## 3. Certification impact

**NOT_READY**

---

**STOP.**

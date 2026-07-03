# EXEC-003 Deployment Inventory

**Execution ID:** BHOS-STAGING-SOAK-EXEC-003  
**Date:** 2026-07-03  
**Namespace (planned):** `bhojanos-staging-spine`

---

## Running Services

| Service | Type | Replicas planned | Replicas running | Image |
|---------|------|------------------|------------------|-------|
| bhojanos-api | Deployment | 2 | **0** | N/A |
| order-projection-worker | Deployment | 2 | **0** | N/A |
| menu-projection-worker | Deployment | 2 | **0** | N/A |
| outbox-service | Deployment | 1 | **0** | N/A |
| replay-service | Deployment | 1 | **0** | N/A |
| otel-collector | DaemonSet | per-node | **0** | N/A |
| prometheus | StatefulSet | 1 | **0** | N/A |
| grafana | Deployment | 1 | **0** | N/A |
| alertmanager | Deployment | 1 | **0** | N/A |

---

## Endpoints

| Endpoint | Planned | Observed |
|----------|---------|----------|
| API `/health/live` | `staging-api.bhojanos.internal/health/live` | **Unreachable** |
| API `/health/ready` | same | **Unreachable** |
| Worker `/health/projection` | ClusterIP :8080 | **N/A** |
| Grafana | `:3000` internal | **N/A** |
| Prometheus | `:9090` internal | **N/A** |
| OTEL gRPC | `:4317` | **N/A** |

---

## Kubernetes Objects

| Object | Planned | Applied |
|--------|---------|---------|
| Namespace | `bhojanos-staging-spine` | **No** |
| NetworkPolicies | 3 | **No** |
| ServiceAccounts | 5 | **No** |
| RBAC Role/Binding | Yes | **No** |
| HPA | 4 | **No** |
| PDB | 4 | **No** |

---

## Helm Releases

| Release | Chart | Status |
|---------|-------|--------|
| otel-collector | otel-collector | **Not installed** |
| prometheus | prometheus | **Not installed** |
| grafana | grafana | **Not installed** |
| alertmanager | alertmanager | **Not installed** |
| bhojanos-api | bhojanos-api | **Not installed** |
| order-projection-worker | order-projection-worker | **Not installed** |
| menu-projection-worker | menu-projection-worker | **Not installed** |
| outbox-service | outbox-service | **Not installed** |
| replay-service | replay-service | **Not installed** |

---

**Total running pods: 0**

**STOP.**

# Scalability Review — IaC

**Document ID:** BHOS-IAC-SCALE-001

## Staging soak capacity

| Component | Staging | Scale trigger |
|-----------|---------|---------------|
| order-projection-worker | 2–4 replicas | lag >15s, CPU >80% |
| menu-projection-worker | 2–4 replicas | snapshot age, CPU |
| outbox-service | 1–2 replicas | depth >500 |
| replay-service | 1–2 replicas | on-demand |
| GKE nodes | 3–6 | cluster autoscaler |
| Firestore | Managed | 10 tenants synthetic |
| Prometheus | 50Gi PVC | 15d retention |

## Production path (template environments)

- Horizontal partition by tenant ID for projection workers
- Redis enabled for checkpoint cache at scale
- Multi-region GKE (DR template)
- Firestore PITR + cross-region GCS replica

## Bottleneck analysis

| Bottleneck | Mitigation |
|------------|------------|
| Firestore write throughput | Batch writes, tenant sharding |
| Single Prometheus | Thanos/Mimir for prod template |
| Outbox depth spikes | HPA on outbox-service |
| Replay job duration | Dedicated replay node pool |

Staging IaC adequately supports 72h soak at defined SLIs.

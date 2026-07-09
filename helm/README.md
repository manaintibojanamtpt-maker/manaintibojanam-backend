# BhojanOS Helm Charts

Deploy spine infrastructure to GKE. Staging values in `values/staging.yaml`.

## Charts

| Chart | Workload |
|-------|----------|
| `bhojanos-api` | API shell (health endpoints) |
| `order-projection-worker` | Order projection + runtime |
| `menu-projection-worker` | Menu projection |
| `replay-service` | Event replay |
| `outbox-service` | Outbox publisher |
| `otel-collector` | OpenTelemetry collector (DaemonSet) |
| `prometheus` | Metrics |
| `grafana` | Dashboards |
| `alertmanager` | Alert routing |

## Install (staging — do not run without approval)

```bash
helm upgrade --install otel-collector ./charts/otel-collector \
  -f values/staging.yaml -n bhojanos-staging-spine --create-namespace

helm upgrade --install prometheus ./charts/prometheus \
  -f values/staging.yaml -n bhojanos-staging-spine

# ... repeat for each chart
```

All spine flags default **OFF** via ConfigMap / env.

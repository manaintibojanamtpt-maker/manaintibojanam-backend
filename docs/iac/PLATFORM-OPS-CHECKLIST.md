# Platform Ops Checklist — Pre-Soak

**Document ID:** BHOS-IAC-OPS-CHECKLIST-001  
**Program:** BHOS-STAGING-SOAK-001

## Infrastructure

- [ ] Terraform apply complete (staging)
- [ ] GKE cluster healthy (3 nodes)
- [ ] All GCS buckets created
- [ ] Secret Manager secrets populated (not placeholders)
- [ ] Artifact Registry accessible

## Kubernetes

- [ ] Namespace `bhojanos-staging-spine` applied
- [ ] Network policies active
- [ ] Workload Identity bindings verified
- [ ] All 9 Helm charts deployed
- [ ] HPA and PDB configured

## Feature flags

- [ ] LaunchDarkly staging project initialized (23 flags)
- [ ] All spine flags OFF verified
- [ ] Prod flag guard cron running
- [ ] Emergency kill switch tested (tabletop)
- [ ] Audit webhook configured

## Observability

- [ ] OTEL collector DaemonSet on all nodes
- [ ] Prometheus scraping all targets
- [ ] Grafana dashboards provisioned (7 UIDs)
- [ ] Alertmanager → Slack + PagerDuty staging
- [ ] All alert rules firing test passed

## Tenants

- [ ] 10 tenants provisioned
- [ ] Control tenants: legacy only, no shadow events
- [ ] T-0 Firestore export to GCS
- [ ] Replay corpus uploaded

## CI/CD

- [ ] GitHub Actions WIF configured
- [ ] Container images built and pushed
- [ ] Smoke test workflow green
- [ ] Rollback L1 drill <60s documented

## Regression

- [ ] `npm run test:sdk` → 1033/1033 on deploy SHA

## ARB sign-off

- [ ] Infrastructure readiness review complete
- [ ] GO for Phase A bootstrap authorized

**STOP.** Do not begin Phase B flag enable until all boxes checked.

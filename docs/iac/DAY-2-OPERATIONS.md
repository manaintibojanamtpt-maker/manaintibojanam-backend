# Day-2 Operations Guide

**Document ID:** BHOS-IAC-DAY2-001

## Routine maintenance

| Task | Frequency | Owner |
|------|-----------|-------|
| Secret rotation review | 30 days before expiry | SRE |
| GKE node pool upgrade | Monthly (maintenance window) | Platform Ops |
| Terraform drift detection | Weekly (`terraform plan`) | SRE |
| Grafana dashboard git sync | On change | SRE |
| Firestore backup verification | Weekly restore test | SRE |
| Prod flag guard audit | Daily | Automated |

## Scaling adjustments

Edit Helm values or HPA:
```bash
helm upgrade order-projection-worker ./helm/charts/order-projection-worker \
  -f helm/values/staging.yaml \
  --set autoscaling.maxReplicas=4 \
  -n bhojanos-staging-spine
```

## Certificate / ingress renewal

Staging API ingress: `staging-api.bhojanos.internal` — renew via cert-manager (add when external DNS configured).

## Log retention

- Cloud Logging: 30 days (workers), 14 days (API)
- GCS logs bucket: 30 days lifecycle
- Flag audit: 365 days

## Cost optimization

- Scale GKE to min nodes outside soak windows
- Disable Redis (not provisioned in v1)
- Review Artifact Registry image retention policy

## Decommission (post-soak)

1. Execute L1 rollback
2. Export all evidence to long-term archive
3. `terraform destroy` staging (ARB approval)
4. Retain GCS evidence bucket 90 days

# Cost Estimate — Staging IaC

**Document ID:** BHOS-IAC-COST-001  
**Environment:** Staging only (soak month)

| Resource | Spec | Monthly (USD) |
|----------|------|---------------|
| GKE cluster | 3× e2-standard-4 | $280–420 |
| Firestore | 10 tenants synthetic | $50–150 |
| GCS (6 buckets) | Evidence + backups | $20–40 |
| Cloud NAT + Router | Standard | $30–45 |
| Secret Manager | 7 secrets | $5–10 |
| Artifact Registry | 5 images | $10–20 |
| Cloud Monitoring/Logging | Standard | $20–40 |
| LaunchDarkly | Staging project | $0–75 |
| **Total staging** | | **$415–800 / month** |

Production, DR, and other environments: template only — cost TBD at provision time.

**Note:** Redis omitted (saves ~$50/mo) per blueprint v1 soak justification.

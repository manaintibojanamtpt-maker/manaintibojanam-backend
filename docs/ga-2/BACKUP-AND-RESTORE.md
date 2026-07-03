# GA-2 Backup & Restore

**Project:** `bhojanos-prod`  
**Script:** `scripts/backup/firestore-export-prod.sh`

---

## Daily Backup

### Prerequisites

- Google Cloud SDK (`gcloud`) authenticated
- GCS bucket `bhojanos-prod-backups` (or set `GCS_BACKUPS_BUCKET`)
- Service account with `datastore.importExportAdmin`

### Export

```bash
export GCP_PROJECT=bhojanos-prod
export GCS_BACKUPS_BUCKET=bhojanos-prod-backups
bash scripts/backup/firestore-export-prod.sh
```

### Verify export

```bash
gcloud firestore operations list --project=bhojanos-prod
gsutil ls gs://bhojanos-prod-backups/firestore/
```

---

## Scheduled backup (recommended)

Configure in **Google Cloud Scheduler** or CI cron:

- Schedule: `0 2 * * *` (02:00 UTC daily)
- Command: `firestore-export-prod.sh`
- Alert on failure via email/PagerDuty

---

## Restore (L4 — emergency only)

1. Identify backup prefix: `gs://bhojanos-prod-backups/firestore/YYYYMMDDTHHMMSSZ`
2. Firebase Console → Firestore → Import/Export → Import
3. **Warning:** Import overwrites existing data — coordinate with ops
4. Re-deploy Firestore rules: `firebase deploy --only firestore:rules --project bhojanos-prod`
5. Verify `/api/health` and sample tenant read

See also `docs/ga-1/ROLLBACK.md` L4.

---

## Image / config backup

| Asset | Method |
|-------|--------|
| Menu images | Firebase Storage — enable object versioning on prod bucket |
| Firestore rules | Git (`firestore.rules`) |
| Vercel env | Vercel dashboard export |
| Render env | Render dashboard export |

---

## Restore drill (monthly)

1. Export staging test data
2. Import prod backup to **staging only** (`bhojanos-staging`)
3. Verify tenant count and sample order integrity
4. Document drill date in ops log

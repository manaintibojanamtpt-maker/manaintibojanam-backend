# Migrate bhojanos2 → bhojanos-prod (superadmin data)

Path A cutover left **bhojanos-prod** with an empty tenants/leads pipeline. This backfills what the **Command Center** needs.

## What gets copied

| Collection | Used by |
|------------|---------|
| `tenants` | Tenants CRM, Beta cohort, PMF funnel |
| `salesPipeline` | Leads tab |
| `release_notes` | Release Center |
| `users` | Owner links (merge; Auth UIDs may differ on prod) |

**Not copied:** orders, menu, Auth users (prod has its own Firebase Auth).

## Option A — Run on Render (recommended)

1. Wait for deploy with commit `024c125+` on `manaintibojanam-backend`.
2. Firebase Console → **bhojanos2** → Project settings → Service accounts → **Generate new private key**.
3. Render → Environment → add temporarily:
   - `SOURCE_FIREBASE_SERVICE_ACCOUNT` = full JSON (one line)
   - `SOURCE_FIREBASE_PROJECT_ID` = `bhojanos2` (optional)
4. **Dry run:**

```powershell
$body = @{
  secret = "YOUR_CRON_SECRET"
  dryRun = $true
} | ConvertTo-Json
Invoke-RestMethod -Uri "https://manaintibojanam-backend.onrender.com/api/platform/migrate-from-bhojanos2" -Method POST -ContentType "application/json" -Body $body
```

5. **Execute:**

```powershell
$body = @{
  secret = "YOUR_CRON_SECRET"
  dryRun = $false
} | ConvertTo-Json
Invoke-RestMethod -Uri "https://manaintibojanam-backend.onrender.com/api/platform/migrate-from-bhojanos2" -Method POST -ContentType "application/json" -Body $body
```

6. **Remove** `SOURCE_FIREBASE_SERVICE_ACCOUNT` from Render after success.
7. Sign in at `/super-admin` → **Sync Data**.

## Option B — Run locally

```powershell
$env:SOURCE_SA_PATH = ".\secrets\bhojanos2-sa.json"
$env:TARGET_SA_PATH = ".\secrets\bhojanos-prod-sa.json"
node scripts/migrate-bhojanos2-to-prod.cjs --dry-run
node scripts/migrate-bhojanos2-to-prod.cjs --execute
```

Never commit `*-sa.json` files.

## After migration

- **Founder** `mana-inti` is re-linked automatically on server migration.
- Kitchen owners from bhojanos2 must **sign up again on prod** (or use `/api/platform/repair-user-by-email` per email).
- `tenant.ownerId` values from bhojanos2 may not match prod Auth UIDs until owners log in and sync.

## Verify

```powershell
Invoke-RestMethod "https://manaintibojanam-backend.onrender.com/api/health?webClient=1"
# projectId should be bhojanos-prod
```

Open `/super-admin` → tenant count should match dry-run counts.

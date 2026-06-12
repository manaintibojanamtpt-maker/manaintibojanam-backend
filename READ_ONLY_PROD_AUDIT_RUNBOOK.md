# Read-Only Prod Audit Runbook

This runbook is designed to avoid changing your live production app.

## What This Does

- reads a few sample Firestore documents
- reads `adminSettings/global`
- prints a JSON report to your terminal

## What This Does Not Do

- no deploys
- no writes
- no deletes
- no test orders
- no rules changes
- no function changes

## Files

- Script: [read_prod_audit.mjs](f:\Manaintibojanam_final2\read_prod_audit.mjs:1)
- Current working audit: [PROD_AUDIT_TEMPLATE.md](f:\Manaintibojanam_final2\PROD_AUDIT_TEMPLATE.md:1)

## Safe Prerequisite

You need one of these available on the machine:

- `FIREBASE_SERVICE_ACCOUNT` env var containing service-account JSON
- `GOOGLE_APPLICATION_CREDENTIALS` env var pointing to a service-account JSON file

The service account should ideally have read access only for this audit step.

## Safe Command

Run from repo root:

```powershell
node .\read_prod_audit.mjs > prod-audit-sample.json
```

## Recommended Review Flow

1. Run the script once.
2. Open `prod-audit-sample.json`.
3. Compare real fields/statuses against [PROD_AUDIT_TEMPLATE.md](f:\Manaintibojanam_final2\PROD_AUDIT_TEMPLATE.md:1).
4. Update the audit doc with real observed values.
5. Only after that, decide whether to place one controlled COD test order.

## Why This Is Safe

- the script only uses Firestore reads
- it does not call checkout routes
- it does not touch Hosting, Functions, or Firestore rules
- it does not modify any local source used by production runtime

## After This Step

If the JSON output looks correct, the next safe live action is:

1. one controlled COD order
2. then one controlled online order

Those are operational tests, so they should be done intentionally and documented in the audit file before any cleanup work starts.

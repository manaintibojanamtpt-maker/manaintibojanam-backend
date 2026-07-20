#!/usr/bin/env tsx
/**
 * Ensure bhojanos-prod Firebase Auth authorized domains include all production hosts.
 *
 * Usage:
 *   npm run firebase:sync-auth-domains          # apply missing domains
 *   npm run firebase:sync-auth-domains -- --dry-run
 *   npm run firebase:sync-auth-domains -- --check  # exit 1 if any missing
 *
 * Requires FIREBASE_PROJECT_ID=bhojanos-prod and service account credentials
 * (FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS).
 */
import { getAuth } from 'firebase-admin/auth';
import { FirebaseAdminProvider } from '../../backend-lib/firebase/FirebaseAdminProvider.js';

/** Keep in sync with docs/firebase/AUTHORIZED-DOMAINS.md */
export const REQUIRED_AUTH_DOMAINS = [
  'localhost',
  'bhojanos.com',
  'www.bhojanos.com',
  'orderbhojan.web.app',
  'orderbhojan.firebaseapp.com',
  'orderbhojan.com',
  'www.orderbhojan.com',
  'manaintibojanam.web.app',
  'manaintibojanam.firebaseapp.com',
  'bhojanos-owner.web.app',
  'bhojanos-admin.web.app',
] as const;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const checkOnly = process.argv.includes('--check');

  await FirebaseAdminProvider.initialize({ skipProbe: true });
  const manager = getAuth().projectConfigManager();
  const config = await manager.getProjectConfig();
  const current = [...(config.authorizedDomains ?? [])].sort();
  const missing = REQUIRED_AUTH_DOMAINS.filter((domain) => !current.includes(domain));

  console.log(`Project: ${config.projectId ?? 'bhojanos-prod'}`);
  console.log(`Authorized domains (${current.length}): ${current.join(', ')}`);

  if (missing.length === 0) {
    console.log('\n✔ All required auth domains are present.');
    return;
  }

  console.log(`\nMissing (${missing.length}): ${missing.join(', ')}`);

  if (checkOnly) {
    console.error('\n✘ Run `npm run firebase:sync-auth-domains` with service account credentials to fix.');
    process.exit(1);
  }

  if (dryRun) {
    console.log('\nDry run — no changes applied.');
    return;
  }

  const merged = [...new Set([...current, ...missing])].sort();
  await manager.updateProjectConfig({ authorizedDomains: merged });
  console.log(`\n✔ Updated authorized domains (${merged.length} total).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

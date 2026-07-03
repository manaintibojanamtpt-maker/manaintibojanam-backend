#!/usr/bin/env node
/**
 * GA-2 production readiness verifier — extends GA-1 legacy flag checks.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

const requiredArtifacts = [
  'docs/ga-2/README.md',
  'docs/ga-2/GA-2-CUSTOMER-ONBOARDING-STABILIZATION.md',
  'docs/ga-2/ONBOARDING-CHECKLIST.md',
  'docs/ga-2/MONITORING.md',
  'docs/ga-2/QUALITY-GATES.md',
  'src/lib/ownerOrderAnalytics.ts',
  'src/components/owner/DashboardProductionMetrics.tsx',
  'src/pages/marketing/HelpCenterPage.tsx',
  'scripts/backup/firestore-export-prod.sh',
];

let failed = false;

console.log('=== GA-2 Production Readiness Verification ===\n');

const ga1 = spawnSync('node', ['scripts/ga1/verify-production-legacy-flags.mjs'], {
  cwd: root,
  stdio: 'inherit',
});
if (ga1.status !== 0) {
  failed = true;
}

console.log('\n--- GA-2 artifact checks ---');
for (const rel of requiredArtifacts) {
  const abs = resolve(root, rel);
  if (existsSync(abs)) {
    console.log(`OK  ${rel}`);
  } else {
    console.error(`MISSING  ${rel}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nGA-2 verification FAILED');
  process.exit(1);
}

console.log('\nGA-2 OK: Legacy path intact, GA-2 deliverables present');
console.log('Next: npm run gate:ga2');

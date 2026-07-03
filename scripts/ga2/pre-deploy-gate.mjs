#!/usr/bin/env node
/**
 * GA-2 quality gate — legacy flags + security tests + production builds.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('=== GA-2 Quality Gate ===');
console.log('Program: Customer Onboarding & Production Stabilization');
console.log('Architecture: Legacy SDKs → Firestore only\n');

run('node', ['scripts/ga2/verify-production-readiness.mjs']);

const skipTests = process.argv.includes('--skip-tests');
if (!skipTests) {
  run('npm', ['run', 'test:security']);
  run('npm', ['run', 'build:web']);
  run('npm', ['run', 'build:server']);
}

console.log('\n=== GA-2 Quality Gate PASSED ===');
console.log('Next: onboard first production customer per docs/ga-2/ONBOARDING-CHECKLIST.md');

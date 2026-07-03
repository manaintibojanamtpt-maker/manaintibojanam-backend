#!/usr/bin/env node
/**
 * GA-1 pre-deploy quality gate — runs flag verification then delegates to npm scripts.
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

console.log('=== GA-1 Pre-Deploy Quality Gate ===');
console.log('Program: Legacy Production Deployment (GA-1)');
console.log('Architecture: Legacy SDKs → Firestore only\n');

run('node', ['scripts/ga1/verify-production-legacy-flags.mjs']);

const skipTests = process.argv.includes('--skip-tests');
if (!skipTests) {
  run('npm', ['run', 'test:security']);
  run('npm', ['run', 'build:web']);
  run('npm', ['run', 'build:server']);
}

console.log('\n=== GA-1 Pre-Deploy Gate PASSED ===');
console.log('Next: deploy via Vercel (frontend) + Render (API) per docs/ga-1/GA-1-LEGACY-PRODUCTION-DEPLOYMENT.md');

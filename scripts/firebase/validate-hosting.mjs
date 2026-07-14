#!/usr/bin/env node
/**
 * Validates Firebase multi-site hosting configuration before deploy.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

const firebaserc = JSON.parse(readFileSync(join(root, '.firebaserc'), 'utf8'));
const firebase = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));

const requiredTargets = ['orderbhojan', 'manaintibojanam', 'owner', 'admin'];
const hostingTargets = firebase.hosting.map((entry) => entry.target);

for (const target of requiredTargets) {
  if (!hostingTargets.includes(target)) {
    console.error(`[validate-firebase-hosting] Missing hosting target in firebase.json: ${target}`);
    process.exit(1);
  }
}

const orderbhojanEntry = firebase.hosting.find((entry) => entry.target === 'orderbhojan');
if (orderbhojanEntry?.public !== 'orderbhojan/dist') {
  console.error('[validate-firebase-hosting] orderbhojan target must publish orderbhojan/dist');
  process.exit(1);
}

if (firebaserc.projects.default !== 'bhojanos-prod') {
  console.error('[validate-firebase-hosting] .firebaserc default project must be bhojanos-prod');
  process.exit(1);
}

if (!firebaserc.targets?.orderbhojan?.hosting?.orderbhojan?.includes('orderbhojan')) {
  console.error('[validate-firebase-hosting] orderbhojan target must map to site orderbhojan on project orderbhojan');
  process.exit(1);
}

if (!existsSync(join(root, 'orderbhojan/dist/index.html'))) {
  console.warn('[validate-firebase-hosting] orderbhojan/dist/index.html missing — run npm run build --prefix orderbhojan before deploy');
}

const hasFirebaseToken = Boolean(process.env.FIREBASE_TOKEN?.trim());
const skipDryRun = process.env.CI === 'true' && !hasFirebaseToken;

if (skipDryRun) {
  console.log(
    '[validate-firebase-hosting] Skipping firebase deploy dry-run in CI (set FIREBASE_TOKEN to enable live auth check)',
  );
  console.log('[validate-firebase-hosting] Configuration OK — orderbhojan deploy targets https://orderbhojan.web.app');
  process.exit(0);
}

const dryRun = spawnSync(
  'npx',
  ['firebase', 'deploy', '--only', 'hosting:orderbhojan', '--project', 'orderbhojan', '--dry-run'],
  { cwd: root, stdio: 'inherit', shell: true },
);

if (dryRun.status !== 0) {
  console.error('[validate-firebase-hosting] firebase dry-run failed for hosting:orderbhojan');
  process.exit(dryRun.status ?? 1);
}

console.log('[validate-firebase-hosting] Configuration OK — orderbhojan deploy targets https://orderbhojan.web.app');

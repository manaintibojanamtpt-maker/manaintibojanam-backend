#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function run(label, command, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n[gate:m3] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/m3/MIGRATION-NOTES.md',
  'docs/m3/RELEASE-NOTES.md',
  'docs/m3/M3-COMPLETION-REPORT.md',
  'docs/m3/ARCHITECTURE-COMPLIANCE-REPORT.md',
];

const requiredFiles = [
  'src/features/discovery/index.ts',
  'src/features/discovery/engine/discoveryEngine.ts',
  'src/features/discovery/infrastructure/discoveryApiClient.ts',
  'src/features/discovery/ui/DiscoveryHomeFeed.tsx',
  'src/features/discovery/ui/DiscoveryRestaurantCard.tsx',
  'src/types/marketplace-discovery.ts',
  'src/styles/experience-discovery.css',
  'tests/m3-discovery.test.ts',
  'scripts/gate-m3.mjs',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:m3] Missing doc: ${doc}`);
    process.exit(1);
  }
}

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    console.error(`[gate:m3] Missing file: ${file}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.version).includes('m3') && !String(pkg.version).includes('m4') && !String(pkg.version).includes('m5') && !String(pkg.version).includes('m6') && !String(pkg.version).includes('m65')) {
  console.error('[gate:m3] package.json version must include m3');
  process.exit(1);
}

const flagsSrc = readFileSync(join(root, 'src/featureFlags/flags.ts'), 'utf8');
if (!flagsSrc.includes('FF_OB_DISCOVERY: false')) {
  console.error('[gate:m3] FF_OB_DISCOVERY must default false');
  process.exit(1);
}

const home = readFileSync(
  join(root, 'src/features/experience/ui/home/HomeExperiencePage.tsx'),
  'utf8',
);
if (!home.includes('DiscoveryHomeFeed') || home.includes('getMarketplaceApiClient')) {
  console.error('[gate:m3] Home must use DiscoveryHomeFeed without direct API client');
  process.exit(1);
}

const discoveryCss = readFileSync(join(root, 'src/styles/experience-discovery.css'), 'utf8');
if (!discoveryCss.includes('safe-area-inset-bottom') || !discoveryCss.includes('prefers-reduced-motion')) {
  console.error('[gate:m3] Discovery CSS missing safe-area or reduced-motion');
  process.exit(1);
}

run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit + discovery tests', 'npm', ['run', 'test:unit']);
run('OpenAPI validation', 'npm', ['run', 'test:openapi']);
run('Production build', 'npm', ['run', 'build']);
run('Performance smoke', 'npm', ['run', 'test:performance']);
run('Responsive smoke', 'npm', ['run', 'test:responsive']);
run('Lighthouse readiness', 'npm', ['run', 'test:lighthouse']);
run('BDS certification', 'npm', ['run', 'certify:bds']);
run('M2 regression', 'npm', ['run', 'gate:m2']);

console.log('\n=== OrderBhojan M3 Marketplace Discovery Engine Gate PASSED ===');

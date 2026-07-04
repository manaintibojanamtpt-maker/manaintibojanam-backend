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
    console.error(`\n[gate:m5] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/m5/MIGRATION-NOTES.md',
  'docs/m5/RELEASE-NOTES.md',
  'docs/m5/M5-COMPLETION-REPORT.md',
  'docs/m5/ARCHITECTURE-COMPLIANCE-REPORT.md',
];

const requiredFiles = [
  'src/features/restaurant/index.ts',
  'src/features/restaurant/engine/restaurantExperienceLayer.ts',
  'src/features/restaurant/infrastructure/restaurantApiClient.ts',
  'src/features/restaurant/ui/RestaurantExperiencePage.tsx',
  'src/types/marketplace-restaurant.ts',
  'src/styles/experience-restaurant.css',
  'tests/m5-restaurant.test.ts',
  'scripts/gate-m5.mjs',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:m5] Missing doc: ${doc}`);
    process.exit(1);
  }
}

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    console.error(`[gate:m5] Missing file: ${file}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.version).includes('m5') && !String(pkg.version).includes('m6') && !String(pkg.version).includes('m65')) {
  console.error('[gate:m5] package.json version must include m5');
  process.exit(1);
}

const flagsSrc = readFileSync(join(root, 'src/featureFlags/flags.ts'), 'utf8');
if (!flagsSrc.includes('FF_OB_RESTAURANT: false')) {
  console.error('[gate:m5] FF_OB_RESTAURANT must default false');
  process.exit(1);
}

const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
if (!router.includes('RestaurantRoutePage') || router.includes('getMarketplaceApiClient')) {
  console.error('[gate:m5] Router must wire RestaurantRoutePage without direct API client');
  process.exit(1);
}

const restaurantCss = readFileSync(join(root, 'src/styles/experience-restaurant.css'), 'utf8');
if (!restaurantCss.includes('safe-area-inset-bottom') || !restaurantCss.includes('prefers-reduced-motion')) {
  console.error('[gate:m5] Restaurant CSS missing safe-area or reduced-motion');
  process.exit(1);
}

run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit + restaurant tests', 'npm', ['run', 'test:unit']);
run('OpenAPI validation', 'npm', ['run', 'test:openapi']);
run('Production build', 'npm', ['run', 'build']);
run('Performance smoke', 'npm', ['run', 'test:performance']);
run('Responsive smoke', 'npm', ['run', 'test:responsive']);
run('Lighthouse readiness', 'npm', ['run', 'test:lighthouse']);
run('BDS certification', 'npm', ['run', 'certify:bds']);
run('M4 regression', 'npm', ['run', 'gate:m4']);

console.log('\n=== OrderBhojan M5 Restaurant Experience Platform Gate PASSED ===');

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
    console.error(`\n[gate:m6] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/m6/MIGRATION-NOTES.md',
  'docs/m6/RELEASE-NOTES.md',
  'docs/m6/M6-COMPLETION-REPORT.md',
  'docs/m6/ARCHITECTURE-COMPLIANCE-REPORT.md',
];

const requiredFiles = [
  'src/features/food/index.ts',
  'src/features/food/engine/foodExperienceLayer.ts',
  'src/features/food/infrastructure/foodApiClient.ts',
  'src/features/food/ui/FoodExperiencePage.tsx',
  'src/types/marketplace-food.ts',
  'src/styles/experience-food.css',
  'tests/m6-food.test.ts',
  'scripts/gate-m6.mjs',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:m6] Missing doc: ${doc}`);
    process.exit(1);
  }
}

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    console.error(`[gate:m6] Missing file: ${file}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.version).includes('m6') && !String(pkg.version).includes('m65') && !String(pkg.version).includes('px2')) {
  console.error('[gate:m6] package.json version must include m6, m65, or px2');
  process.exit(1);
}

const flagsSrc = readFileSync(join(root, 'src/featureFlags/flags.ts'), 'utf8');
if (!flagsSrc.includes('FF_OB_MENU: false')) {
  console.error('[gate:m6] FF_OB_MENU must default false');
  process.exit(1);
}

const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
if (!router.includes('FoodRoutePage') || router.includes('getMarketplaceApiClient')) {
  console.error('[gate:m6] Router must wire FoodRoutePage without direct API client');
  process.exit(1);
}

const foodCss = readFileSync(join(root, 'src/styles/experience-food.css'), 'utf8');
if (!foodCss.includes('safe-area-inset-bottom') || !foodCss.includes('prefers-reduced-motion')) {
  console.error('[gate:m6] Food CSS missing safe-area or reduced-motion');
  process.exit(1);
}

const foodPage = readFileSync(join(root, 'src/features/food/ui/FoodExperiencePage.tsx'), 'utf8');
if (foodPage.includes('getMarketplaceApiClient') || foodPage.includes('checkout')) {
  console.error('[gate:m6] Food UI must not call marketplace client or checkout directly');
  process.exit(1);
}

run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit + food tests', 'npm', ['run', 'test:unit']);
run('OpenAPI validation', 'npm', ['run', 'test:openapi']);
run('Production build', 'npm', ['run', 'build']);
run('Performance smoke', 'npm', ['run', 'test:performance']);
run('Responsive smoke', 'npm', ['run', 'test:responsive']);
run('Lighthouse readiness', 'npm', ['run', 'test:lighthouse']);
run('BDS certification', 'npm', ['run', 'certify:bds']);
run('M5 regression', 'npm', ['run', 'gate:m5']);

console.log('\n=== OrderBhojan M6 Food Experience Platform Gate PASSED ===');

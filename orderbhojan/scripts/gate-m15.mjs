#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function run(label, command, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n[gate:m15] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/m15/M15-EXPERIENCE-SHELL-REPORT.md',
  'docs/m15/ARCHITECTURE-REPORT.md',
  'docs/m15/MIGRATION-NOTES.md',
  'docs/m15/ACCEPTANCE-CHECKLIST.md',
  'docs/m15/RELEASE-NOTES.md',
];

const requiredExperienceFiles = [
  'src/features/experience/ui/home/HomeExperiencePage.tsx',
  'src/features/experience/ui/search/SearchExperiencePage.tsx',
  'src/features/experience/ui/cart/CartExperiencePage.tsx',
  'src/features/experience/ui/orders/OrdersExperiencePage.tsx',
  'src/features/experience/ui/layout/ExperienceBottomNav.tsx',
  'src/features/experience/ui/shared/MarketplaceRestaurantTile.tsx',
  'src/features/experience/ui/shared/MarketplaceFoodTile.tsx',
  'src/features/experience/ui/shared/MarketplaceFloatingCart.tsx',
  'src/features/experience/data/mockCatalog.ts',
  'src/styles/experience-shell.css',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:m15] Missing required doc: ${doc}`);
    process.exit(1);
  }
}

for (const file of requiredExperienceFiles) {
  if (!existsSync(resolve(root, file))) {
    console.error(`[gate:m15] Missing experience file: ${file}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.version).includes('m15') && !String(pkg.version).includes('m16') && !String(pkg.version).includes('m2') && !String(pkg.version).includes('m3') && !String(pkg.version).includes('m4') && !String(pkg.version).includes('m5') && !String(pkg.version).includes('m6') && !String(pkg.version).includes('m65')) {
  console.error('[gate:m15] package.json version must include m15 or m16 tag');
  process.exit(1);
}

run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit tests', 'npm', ['run', 'test:unit']);
run('OpenAPI validation', 'npm', ['run', 'test:openapi']);
run('Production build', 'npm', ['run', 'build']);
run('Performance smoke', 'npm', ['run', 'test:performance']);
run('BDS certification', 'npm', ['run', 'certify:bds']);
run('M1 regression', 'npm', ['run', 'gate:m1']);

console.log('\n=== OrderBhojan M1.5 Experience Shell Gate PASSED ===');

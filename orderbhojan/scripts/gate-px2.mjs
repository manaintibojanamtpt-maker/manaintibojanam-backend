#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const bdsRoot = resolve(root, '../packages/design-system');

function run(label, command, args, cwd = root) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n[gate:px2] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredPx15Docs = [
  'docs/px15/DESIGN-FREEZE.md',
  'docs/px15/VISUAL-SPECIFICATION.md',
  'docs/px15/SCREEN-BLUEPRINTS.md',
  'docs/px15/COMPONENT-MAPPING.md',
  'docs/px15/DESIGN-TOKENS.md',
  'docs/px15/IMPLEMENTATION-HANDOFF.md',
];

const requiredPx2Artifacts = [
  'src/styles/experience-px2-layout.css',
  'tests/px2-design-implementation.test.ts',
  'scripts/gate-px2.mjs',
  'docs/px2/PX2-IMPLEMENTATION-REPORT.md',
  'docs/px2/VISUAL-VERIFICATION.md',
  'docs/px2/BDS-COMPLIANCE-REPORT.md',
  'docs/px2/ACCESSIBILITY-VALIDATION.md',
  'docs/px2/RESPONSIVE-VALIDATION.md',
  'docs/px2/RELEASE-NOTES.md',
];

for (const doc of requiredPx15Docs) {
  const path = resolve(root, doc);
  if (!existsSync(path)) {
    console.error(`[gate:px2] Missing PX1.5 source doc: ${doc}`);
    process.exit(1);
  }
}

for (const file of requiredPx2Artifacts) {
  if (!existsSync(resolve(root, file))) {
    console.error(`[gate:px2] Missing artifact: ${file}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.version).includes('px2')) {
  console.error('[gate:px2] package.json version must include px2');
  process.exit(1);
}

const bdsPkg = JSON.parse(readFileSync(join(bdsRoot, 'package.json'), 'utf8'));
if (!String(bdsPkg.version).includes('px2')) {
  console.error('[gate:px2] @bhojan/design-system must be px2 tagged');
  process.exit(1);
}

const px2Css = readFileSync(join(bdsRoot, 'src/styles/bds-px2.css'), 'utf8');
for (const token of [
  'bds-immersive-hero',
  'bds-food-row',
  'bds-nav-island',
  'bds-premium-search',
  'safe-area-inset-bottom',
  'prefers-reduced-motion',
]) {
  if (!px2Css.includes(token)) {
    console.error(`[gate:px2] BDS PX2 CSS missing ${token}`);
    process.exit(1);
  }
}

const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
if (main.includes('experience-premium-m65.css')) {
  console.error('[gate:px2] main.tsx must not import M65 CSS');
  process.exit(1);
}

const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
if (router.includes('getMarketplaceApiClient')) {
  console.error('[gate:px2] Router must not import marketplace client');
  process.exit(1);
}

const foodPage = readFileSync(join(root, 'src/features/food/ui/FoodExperiencePage.tsx'), 'utf8');
if (foodPage.includes('getMarketplaceApiClient') || foodPage.includes('checkout')) {
  console.error('[gate:px2] Food UI must not call marketplace client or checkout directly');
  process.exit(1);
}

run('BDS build', 'npm', ['run', 'build'], bdsRoot);
run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit + PX2 tests', 'npm', ['run', 'test:unit']);
run('OpenAPI validation', 'npm', ['run', 'test:openapi']);
run('Production build', 'npm', ['run', 'build']);
run('Design system architecture', 'node', [
  join(root, '../scripts/design-system/validate-architecture.mjs'),
]);
run('Design system compliance', 'node', [join(root, '../scripts/validate-design-system.mjs')]);
run('Performance smoke', 'npm', ['run', 'test:performance']);
run('Responsive smoke', 'npm', ['run', 'test:responsive']);
run('Lighthouse readiness', 'npm', ['run', 'test:lighthouse']);
run('BDS certification', 'npm', ['run', 'certify:bds']);
run('M6 food regression tests', 'node', ['--import', 'tsx', '--test', 'tests/m6-food.test.ts']);

console.log('\n=== OrderBhojan PX2 Design-to-Code Implementation Gate PASSED ===');

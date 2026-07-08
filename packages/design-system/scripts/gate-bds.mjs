#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function run(label, command, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n[gate:bds] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/BDS-1-FOUNDATION-REPORT.md',
  'docs/DESIGN-TOKEN-GUIDE.md',
  'docs/COMPONENT-GUIDE.md',
  'docs/MOTION-GUIDE.md',
  'docs/THEME-GUIDE.md',
  'docs/ACCESSIBILITY-GUIDE.md',
  'docs/DEVELOPER-GUIDE.md',
  'docs/MIGRATION-GUIDE.md',
  'docs/STORYBOOK-GUIDE.md',
  'docs/DRB-EXIT-REVIEW.md',
  'docs/MIGRATION-CHECKLIST.md',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:bds] Missing required documentation: ${doc}`);
    process.exit(1);
  }
}

const requiredComponentDirs = [
  'Button', 'Card', 'RestaurantCard', 'FoodCard', 'OfferCard', 'Badge', 'Chip', 'Avatar', 'Icon',
  'Dialog', 'BottomSheet', 'Modal', 'Drawer', 'SearchBar', 'Input', 'OTPInput', 'AddressInput',
  'PhoneInput', 'QuantityStepper', 'Price', 'BillSummary', 'Timeline', 'CartBar', 'FloatingCart',
  'Navigation', 'Tabs', 'SegmentedControl', 'Skeleton', 'Loader', 'Toast', 'EmptyState', 'ErrorState', 'FeatureFlag',
];

for (const dir of requiredComponentDirs) {
  const path = resolve(root, 'src/components', dir);
  if (!existsSync(path)) {
    console.error(`[gate:bds] Missing component directory: src/components/${dir}`);
    process.exit(1);
  }
}

const tokenFiles = ['colors', 'typography', 'spacing', 'radius', 'shadows', 'animation', 'opacity', 'breakpoints', 'elevation', 'zIndex', 'durations'];
for (const file of tokenFiles) {
  if (!existsSync(resolve(root, 'src/tokens', `${file}.ts`))) {
    console.error(`[gate:bds] Missing token file: src/tokens/${file}.ts`);
    process.exit(1);
  }
}

run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit tests', 'npm', ['run', 'test:unit']);
run('Accessibility smoke', 'npm', ['run', 'test:a11y']);
run('Production build', 'npm', ['run', 'build']);

const distIndex = resolve(root, 'dist/index.js');
if (!existsSync(distIndex)) {
  console.error('[gate:bds] dist/index.js missing after build');
  process.exit(1);
}

const distSize = statSync(distIndex).size;
const maxBundleBytes = 512 * 1024;
if (distSize > maxBundleBytes) {
  console.error(`[gate:bds] Bundle size ${distSize} exceeds ${maxBundleBytes} bytes`);
  process.exit(1);
}
console.log(`\n[gate:bds] dist/index.js size: ${(distSize / 1024).toFixed(1)} KB (limit ${maxBundleBytes / 1024} KB)`);

run('Storybook build', 'npm', ['run', 'build:storybook']);

console.log('\n=== Bhojan Design System BDS-1 Quality Gate PASSED ===');

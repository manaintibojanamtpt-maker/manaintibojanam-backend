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
    console.error(`\n[gate:m2] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/m2/MIGRATION-NOTES.md',
  'docs/m2/RELEASE-NOTES.md',
  'docs/m2/M2-COMPLETION-REPORT.md',
  'docs/m2/ARCHITECTURE-COMPLIANCE-REPORT.md',
  'docs/m2/ACCEPTANCE-CHECKLIST.md',
];

const requiredFiles = [
  'src/features/location/index.ts',
  'src/features/location/ui/LocationChip.tsx',
  'src/features/location/ui/LocationSelectorSheet.tsx',
  'src/styles/experience-location.css',
  'src/types/marketplace-location.ts',
  'scripts/gate-m2.mjs',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:m2] Missing doc: ${doc}`);
    process.exit(1);
  }
}

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    console.error(`[gate:m2] Missing file: ${file}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.version).includes('m2') && !String(pkg.version).includes('m3') && !String(pkg.version).includes('m4') && !String(pkg.version).includes('m5') && !String(pkg.version).includes('m6') && !String(pkg.version).includes('m65')) {
  console.error('[gate:m2] package.json version must include m2');
  process.exit(1);
}

const flagsSrc = readFileSync(join(root, 'src/featureFlags/flags.ts'), 'utf8');
if (!flagsSrc.includes('FF_LOCATION_ENABLED: false')) {
  console.error('[gate:m2] FF_LOCATION_ENABLED must default false');
  process.exit(1);
}

const locationCss = readFileSync(join(root, 'src/styles/experience-location.css'), 'utf8');
if (!locationCss.includes('safe-area-inset-bottom') || !locationCss.includes('prefers-reduced-motion')) {
  console.error('[gate:m2] Location CSS missing safe-area or reduced-motion');
  process.exit(1);
}

const locationService = readFileSync(join(root, 'src/features/location/application/locationService.ts'), 'utf8');
if (/nominatim/i.test(locationService) || /\/discover/.test(locationService)) {
  console.error('[gate:m2] Location module boundary violation');
  process.exit(1);
}

run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit tests', 'npm', ['run', 'test:unit']);
run('OpenAPI validation', 'npm', ['run', 'test:openapi']);
run('Production build', 'npm', ['run', 'build']);
run('Performance smoke', 'npm', ['run', 'test:performance']);
run('Responsive smoke', 'npm', ['run', 'test:responsive']);
run('Lighthouse readiness', 'npm', ['run', 'test:lighthouse']);
run('BDS certification', 'npm', ['run', 'certify:bds']);
run('M1.6 regression', 'npm', ['run', 'gate:m16']);

console.log('\n=== OrderBhojan M2 Location Intelligence Gate PASSED ===');

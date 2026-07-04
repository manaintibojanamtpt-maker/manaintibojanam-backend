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
    console.error(`\n[gate:m4] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/m4/MIGRATION-NOTES.md',
  'docs/m4/RELEASE-NOTES.md',
  'docs/m4/M4-COMPLETION-REPORT.md',
  'docs/m4/ARCHITECTURE-COMPLIANCE-REPORT.md',
];

const requiredFiles = [
  'src/features/search/index.ts',
  'src/features/search/engine/searchPlatform.ts',
  'src/features/search/infrastructure/searchApiClient.ts',
  'src/features/search/ui/SearchExperience.tsx',
  'src/types/marketplace-search.ts',
  'src/styles/experience-search.css',
  'tests/m4-search.test.ts',
  'scripts/gate-m4.mjs',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:m4] Missing doc: ${doc}`);
    process.exit(1);
  }
}

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    console.error(`[gate:m4] Missing file: ${file}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.version).includes('m4') && !String(pkg.version).includes('m5') && !String(pkg.version).includes('m6') && !String(pkg.version).includes('m65')) {
  console.error('[gate:m4] package.json version must include m4');
  process.exit(1);
}

const flagsSrc = readFileSync(join(root, 'src/featureFlags/flags.ts'), 'utf8');
if (!flagsSrc.includes('FF_OB_SEARCH: false')) {
  console.error('[gate:m4] FF_OB_SEARCH must default false');
  process.exit(1);
}

const searchPage = readFileSync(
  join(root, 'src/features/experience/ui/search/SearchExperiencePage.tsx'),
  'utf8',
);
if (!searchPage.includes('SearchExperience') || searchPage.includes('getMarketplaceApiClient')) {
  console.error('[gate:m4] Search page must use SearchExperience without direct API client');
  process.exit(1);
}

const searchCss = readFileSync(join(root, 'src/styles/experience-search.css'), 'utf8');
if (!searchCss.includes('safe-area-inset-bottom') || !searchCss.includes('prefers-reduced-motion')) {
  console.error('[gate:m4] Search CSS missing safe-area or reduced-motion');
  process.exit(1);
}

run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit + search tests', 'npm', ['run', 'test:unit']);
run('OpenAPI validation', 'npm', ['run', 'test:openapi']);
run('Production build', 'npm', ['run', 'build']);
run('Performance smoke', 'npm', ['run', 'test:performance']);
run('Responsive smoke', 'npm', ['run', 'test:responsive']);
run('Lighthouse readiness', 'npm', ['run', 'test:lighthouse']);
run('BDS certification', 'npm', ['run', 'certify:bds']);
run('M3 regression', 'npm', ['run', 'gate:m3']);

console.log('\n=== OrderBhojan M4 Search Intelligence Platform Gate PASSED ===');

#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const bdsRoot = resolve(root, '../packages/design-system');

function run(label, command, args, cwd = root) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n[gate:bds2] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/bds-2/BDS-2-INTEGRATION-REPORT.md',
  'docs/bds-2/DESIGN-SYSTEM-CERTIFICATION.md',
  'docs/bds-2/MIGRATION-COMPLETION-REPORT.md',
  'docs/bds-2/COMPONENT-COVERAGE-REPORT.md',
  'docs/bds-2/THEME-VALIDATION-REPORT.md',
  'docs/bds-2/ACCESSIBILITY-REPORT.md',
  'docs/bds-2/PERFORMANCE-REPORT.md',
  'docs/bds-2/DEVELOPER-MIGRATION-GUIDE.md',
  'docs/bds-2/BDS-2-COMPLETION-REPORT.md',
  'docs/bds-2/DRB-CERTIFICATION-REPORT.md',
  'docs/bds-2/ARCHITECTURE-COMPLIANCE-REPORT.md',
  'docs/bds-2/MIGRATION-CHECKLIST.md',
  'docs/bds-2/VERSION-PROMOTION-REPORT.md',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:bds2] Missing required documentation: ${doc}`);
    process.exit(1);
  }
}

const bdsPkg = JSON.parse(readFileSync(resolve(bdsRoot, 'package.json'), 'utf8'));
if (bdsPkg.version !== '1.0.0') {
  console.error(`[gate:bds2] Expected @bhojan/design-system@1.0.0, got ${bdsPkg.version}`);
  process.exit(1);
}

if (!existsSync(resolve(bdsRoot, 'docs/adr/ADR-BDS-001.md'))) {
  console.error('[gate:bds2] Missing ADR-BDS-001');
  process.exit(1);
}

if (existsSync(resolve(root, 'src/shared/components/Button.tsx'))) {
  console.error('[gate:bds2] Legacy Button.tsx still exists');
  process.exit(1);
}

run('BDS v1.0 gate', 'npm', ['run', 'gate:bds'], bdsRoot);
run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit + BDS tests', 'npm', ['run', 'test:unit']);
run('BDS certification metrics', 'npm', ['run', 'certify:bds']);
run('OpenAPI validation', 'npm', ['run', 'test:openapi']);
run('Production build', 'npm', ['run', 'build']);
run('Performance smoke', 'npm', ['run', 'test:performance']);
run('M0 regression gate', 'npm', ['run', 'gate:m0']);

console.log('\n=== OrderBhojan BDS-2 Integration & Certification Gate PASSED ===');

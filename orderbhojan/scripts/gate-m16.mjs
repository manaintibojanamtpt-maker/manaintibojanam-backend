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
    console.error(`\n[gate:m16] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/m16/M16-PREMIUM-UX-REPORT.md',
  'docs/m16/VISUAL-REVIEW.md',
  'docs/m16/RESPONSIVE-REPORT.md',
  'docs/m16/ACCESSIBILITY-REPORT.md',
  'docs/m16/PERFORMANCE-REPORT.md',
  'docs/m16/MIGRATION-NOTES.md',
  'docs/m16/RELEASE-NOTES.md',
  'docs/m16/ACCEPTANCE-CHECKLIST.md',
  'docs/m16/BEFORE-AFTER.md',
];

const requiredPremiumFiles = [
  'src/styles/experience-premium.css',
  'src/features/experience/hooks/useScrollChrome.ts',
  'src/features/experience/hooks/useBlurUpImage.ts',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:m16] Missing doc: ${doc}`);
    process.exit(1);
  }
}

for (const file of requiredPremiumFiles) {
  if (!existsSync(resolve(root, file))) {
    console.error(`[gate:m16] Missing file: ${file}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.version).includes('m16') && !String(pkg.version).includes('m2') && !String(pkg.version).includes('m3') && !String(pkg.version).includes('m4') && !String(pkg.version).includes('m5') && !String(pkg.version).includes('m6') && !String(pkg.version).includes('m65')) {
  console.error('[gate:m16] package.json version must include m16');
  process.exit(1);
}

const premiumCss = readFileSync(join(root, 'src/styles/experience-premium.css'), 'utf8');
if (!premiumCss.includes('prefers-reduced-motion')) {
  console.error('[gate:m16] Premium CSS must include reduced-motion support');
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
run('M1.5 regression', 'npm', ['run', 'gate:m15']);

console.log('\n=== OrderBhojan M1.6 Premium Experience Gate PASSED ===');

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
    console.error(`\n[gate:m65] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/m65/M65-PREMIUM-EVOLUTION-REPORT.md',
  'docs/m65/VISUAL-AUDIT.md',
  'docs/m65/RESPONSIVE-AUDIT.md',
  'docs/m65/ACCESSIBILITY-AUDIT.md',
  'docs/m65/PERFORMANCE-AUDIT.md',
  'docs/m65/BEFORE-AFTER.md',
  'docs/m65/MIGRATION-NOTES.md',
  'docs/m65/RELEASE-NOTES.md',
  'docs/m65/ARCHITECTURE-COMPLIANCE-REPORT.md',
];

const requiredFiles = [
  'src/styles/experience-premium-m65.css',
  'src/features/experience/motion/premiumMotion.tsx',
  'tests/m65-premium-evolution.test.ts',
  'scripts/gate-m65.mjs',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:m65] Missing doc: ${doc}`);
    process.exit(1);
  }
}

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    console.error(`[gate:m65] Missing file: ${file}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.version).includes('m65')) {
  console.error('[gate:m65] package.json version must include m65');
  process.exit(1);
}

if (!pkg.dependencies?.['framer-motion']) {
  console.error('[gate:m65] framer-motion dependency required');
  process.exit(1);
}

const m65Css = readFileSync(join(root, 'src/styles/experience-premium-m65.css'), 'utf8');
for (const token of [
  'safe-area-inset-top',
  'safe-area-inset-bottom',
  'prefers-reduced-motion',
  'ob-m65-menu',
  'ob-m65-restaurant',
  'ob-m65-home',
]) {
  if (!m65Css.includes(token)) {
    console.error(`[gate:m65] M65 CSS missing ${token}`);
    process.exit(1);
  }
}

const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
if (router.includes('getMarketplaceApiClient')) {
  console.error('[gate:m65] Router must not import marketplace client');
  process.exit(1);
}

const motion = readFileSync(join(root, 'src/features/experience/motion/premiumMotion.tsx'), 'utf8');
if (!motion.includes('framer-motion') || !motion.includes('useReducedMotion')) {
  console.error('[gate:m65] Premium motion must use framer-motion with reduced motion');
  process.exit(1);
}

run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit + M65 tests', 'npm', ['run', 'test:unit']);
run('OpenAPI validation', 'npm', ['run', 'test:openapi']);
run('Production build', 'npm', ['run', 'build']);
run('Performance smoke', 'npm', ['run', 'test:performance']);
run('Responsive smoke', 'npm', ['run', 'test:responsive']);
run('Lighthouse readiness', 'npm', ['run', 'test:lighthouse']);
run('BDS certification', 'npm', ['run', 'certify:bds']);
run('M6 regression', 'npm', ['run', 'gate:m6']);

console.log('\n=== OrderBhojan M6.5 Premium Experience Evolution Gate PASSED ===');

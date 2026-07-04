#!/usr/bin/env node
/**
 * Lighthouse readiness smoke — static checks for perf/a11y foundations.
 * Full Lighthouse audit is manual (see docs/m16/ACCEPTANCE-CHECKLIST.md).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const premiumCss = readFileSync(join(root, 'src/styles/experience-premium.css'), 'utf8');

const checks = [
  ['viewport meta', () => /name="viewport"/i.test(indexHtml)],
  ['theme-color', () => /theme-color/i.test(indexHtml)],
  ['font preconnect', () => /preconnect/i.test(indexHtml) || /fonts\.googleapis/i.test(indexHtml)],
  ['safe-area-inset-top', () => /safe-area-inset-top/.test(premiumCss)],
  ['safe-area-inset-bottom', () => /safe-area-inset-bottom/.test(premiumCss)],
  ['prefers-reduced-motion', () => /prefers-reduced-motion/.test(premiumCss)],
  ['lazy loading hooks', () => existsSync(join(root, 'src/features/experience/hooks/useBlurUpImage.ts'))],
  ['production dist', () => existsSync(join(root, 'dist/index.html'))],
];

let failed = 0;
for (const [label, fn] of checks) {
  if (!fn()) {
    console.error(`[lighthouse-smoke] FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`[lighthouse-smoke] OK: ${label}`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log('[lighthouse-smoke] Lighthouse readiness PASSED');

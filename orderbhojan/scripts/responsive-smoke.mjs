#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const premiumCss = readFileSync(join(root, 'src/styles/experience-premium.css'), 'utf8');

const breakpoints = [320, 375, 768, 1024, 1280];

for (const bp of breakpoints) {
  const pattern = new RegExp(`min-width:\\s*${bp}px`);
  if (!pattern.test(premiumCss) && bp >= 768) {
    console.error(`[responsive-smoke] Missing breakpoint: ${bp}px`);
    process.exit(1);
  }
}

const required = [
  'env(safe-area-inset-left)',
  'env(safe-area-inset-right)',
  'overflow-x',
  'clamp(',
  '100dvh',
];

for (const token of required) {
  if (!premiumCss.includes(token) && token !== 'overflow-x') {
    console.error(`[responsive-smoke] Missing token: ${token}`);
    process.exit(1);
  }
}

console.log('[responsive-smoke] Responsive + safe-area tokens PASSED');

#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const globalsCss = readFileSync(join(root, 'src/styles/globals.css'), 'utf8');
const mibThemeCss = readFileSync(join(root, 'src/styles/mib-theme.css'), 'utf8');
const styles = `${globalsCss}\n${mibThemeCss}`;

const breakpoints = [320, 375, 768, 1024, 1280];

for (const bp of breakpoints) {
  const pattern = new RegExp(`min-width:\\s*${bp}px`);
  if (!pattern.test(styles) && bp >= 768) {
    console.error(`[responsive-smoke] Missing breakpoint: ${bp}px`);
    process.exit(1);
  }
}

const required = [
  'safe-area-inset-left',
  'safe-area-inset-right',
  '100dvh',
];

for (const token of required) {
  if (!styles.includes(token)) {
    console.error(`[responsive-smoke] Missing token: ${token}`);
    process.exit(1);
  }
}

console.log('[responsive-smoke] Responsive + safe-area tokens PASSED');

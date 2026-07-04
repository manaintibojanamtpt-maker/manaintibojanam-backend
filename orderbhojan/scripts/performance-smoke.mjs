#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distAssets = resolve(root, 'dist/assets');

if (!existsSync(distAssets)) {
  console.error('[test:performance] Run production build first — dist/assets missing');
  process.exit(1);
}

const start = performance.now();
let totalJs = 0;
for (const file of readdirSync(distAssets)) {
  if (file.endsWith('.js')) {
    totalJs += statSync(resolve(distAssets, file)).size;
  }
}
const measureMs = Math.round(performance.now() - start);

// M1.5+ baseline: Firebase Auth + BDS + experience shell (~1.4MB JS precache assets)
const maxJsKb = 1500;
const totalJsKb = Math.round(totalJs / 1024);

console.log(`[test:performance] measure time: ${measureMs}ms`);
console.log(`[test:performance] JS assets total: ${totalJsKb} KB (limit ${maxJsKb} KB)`);

if (totalJsKb > maxJsKb) {
  console.error('[test:performance] Bundle exceeds limit');
  process.exit(1);
}

console.log('[test:performance] Performance smoke PASSED');

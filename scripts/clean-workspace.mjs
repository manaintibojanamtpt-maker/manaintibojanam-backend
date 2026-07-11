#!/usr/bin/env node
/**
 * Removes generated / cache artifacts from the workspace (never source code).
 * Safe to run before commits or to reclaim disk space.
 */
import { existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  '.sync-work',
  '.firebase',
  'orderbhojan/.firebase',
  'dist',
  'orderbhojan/dist',
  'build',
  'coverage',
  'tmp-pune-discovery.json',
  'scripts/.smoke-ops-health-report.json',
];

let removed = 0;
for (const rel of targets) {
  const abs = join(root, rel);
  if (!existsSync(abs)) continue;
  rmSync(abs, { recursive: true, force: true });
  console.log(`[clean-workspace] removed ${rel}`);
  removed += 1;
}

console.log(`[clean-workspace] done (${removed} path(s) removed)`);

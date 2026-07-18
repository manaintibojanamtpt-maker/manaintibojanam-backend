#!/usr/bin/env node
/**
 * CI guard: any tsconfig with compilerOptions.paths must also set compilerOptions.baseUrl.
 * TypeScript path mapping is unreliable without baseUrl (breaks IDE + some bundlers).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function collectTsconfigFiles(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      collectTsconfigFiles(fullPath, acc);
    } else if (/^tsconfig.*\.json$/i.test(entry)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function readJsonFile(filePath) {
  const raw = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function hasPathsWithoutBaseUrl(filePath) {
  let parsed;
  try {
    parsed = readJsonFile(filePath);
  } catch (err) {
    return {
      ok: false,
      reason: `invalid JSON — ${err instanceof Error ? err.message : err}`,
    };
  }

  const compilerOptions = parsed.compilerOptions ?? {};
  const paths = compilerOptions.paths;
  if (!paths || typeof paths !== 'object' || Object.keys(paths).length === 0) {
    return { ok: true };
  }

  const baseUrl = compilerOptions.baseUrl;
  if (typeof baseUrl === 'string' && baseUrl.trim().length > 0) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: 'compilerOptions.paths is set but compilerOptions.baseUrl is missing',
  };
}

function main() {
  const files = collectTsconfigFiles(root).sort();
  const failures = [];

  for (const filePath of files) {
    const result = hasPathsWithoutBaseUrl(filePath);
    if (!result.ok) {
      failures.push({ file: relative(root, filePath), reason: result.reason });
    }
  }

  if (failures.length === 0) {
    console.log(`verify-tsconfig-baseurl: OK (${files.length} tsconfig file(s) checked)`);
    return;
  }

  console.error('verify-tsconfig-baseurl: FAILED\n');
  for (const failure of failures) {
    console.error(`  ${failure.file}: ${failure.reason}`);
  }
  console.error('\nFix: add "baseUrl": "." (or the package root) under compilerOptions.');
  process.exit(1);
}

main();

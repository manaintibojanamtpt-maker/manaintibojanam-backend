/**
 * M1 PR-1 — Block new direct Firestore imports in presentation code (ADR-011).
 * Existing violations are listed in presentation-firestore-allowlist.txt.
 *
 * Run: npm run lint:presentation
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const allowlistPath = join(__dirname, 'presentation-firestore-allowlist.txt');

const PRESENTATION_ROOTS = ['src/pages', 'src/components'];
const FIRESTORE_IMPORT_RE =
  /from\s+['"]firebase\/firestore['"]|import\s*\(\s*['"]firebase\/firestore['"]\s*\)/;

const normalizePath = (filePath) => relative(repoRoot, filePath).replace(/\\/g, '/');

const loadAllowlist = () => {
  const raw = readFileSync(allowlistPath, 'utf8');
  return new Set(
    raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  );
};

const collectSourceFiles = (dir) => {
  const absDir = join(repoRoot, dir);
  const results = [];
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (/\.(tsx?|jsx?)$/.test(entry)) {
        results.push(full);
      }
    }
  };
  walk(absDir);
  return results;
};

const allowlist = loadAllowlist();
const violations = [];
const staleAllowlist = new Set(allowlist);

for (const root of PRESENTATION_ROOTS) {
  for (const file of collectSourceFiles(root)) {
    const rel = normalizePath(file);
    const content = readFileSync(file, 'utf8');
    const hasFirestoreImport = FIRESTORE_IMPORT_RE.test(content);

    if (hasFirestoreImport) {
      staleAllowlist.delete(rel);
      if (!allowlist.has(rel)) {
        violations.push(rel);
      }
    }
  }
}

if (violations.length > 0) {
  console.error('[lint:presentation] New direct Firestore imports are not allowed in presentation code:');
  for (const file of violations.sort()) {
    console.error(`  - ${file}`);
  }
  console.error('\nUse src/services or the SDK strangler path (ADR-011).');
  process.exit(1);
}

if (staleAllowlist.size > 0) {
  console.warn('[lint:presentation] Allowlist entries no longer import firebase/firestore (safe to remove):');
  for (const file of [...staleAllowlist].sort()) {
    console.warn(`  - ${file}`);
  }
}

console.log('[lint:presentation] OK — no new presentation-layer Firestore imports.');

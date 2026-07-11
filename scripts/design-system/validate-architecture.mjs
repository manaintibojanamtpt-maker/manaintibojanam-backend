/**
 * Phase 5 — design-system architecture validation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dsRoot = path.join(root, 'src/design-system');

const issues = [];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = walk(full, files);
    else if (/\.(tsx?|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = walk(dsRoot);
const componentLeakPattern = /from ['"]\.\.\/\.\.\/components\//;
const deepImportConsumers = [];

for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  if (componentLeakPattern.test(content)) {
    issues.push(`LEAK: ${rel} imports from src/components`);
  }
}

// Scan app for deep design-system imports (outside design-system and compatibility stubs)
function scanDeepImports(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'design-system' || entry.name === 'node_modules') continue;
      scanDeepImports(full);
      continue;
    }
    if (!/\.(tsx?)$/.test(entry.name)) continue;
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (rel.startsWith('src/components/')) continue; // compatibility stubs allowed
    const content = fs.readFileSync(full, 'utf8');
    const matches = content.matchAll(/from ['"](\.\.?\/design-system\/[^'"]+)['"]/g);
    for (const match of matches) {
      deepImportConsumers.push(`${rel} → ${match[1]}`);
    }
  }
}
scanDeepImports(path.join(root, 'src'));

if (deepImportConsumers.length > 0) {
  for (const row of deepImportConsumers) {
    issues.push(`DEEP_IMPORT: ${row}`);
  }
}

// Barrel files exist
const requiredBarrels = [
  'index.ts',
  'layout/index.ts',
  'cart/index.ts',
  'food/index.ts',
  'orders/index.ts',
  'location/index.ts',
  'primitives/index.ts',
  'marketplace/index.ts',
  'skeleton/index.ts',
  'tokens/index.ts',
];
for (const barrel of requiredBarrels) {
  if (!fs.existsSync(path.join(dsRoot, barrel))) {
    issues.push(`MISSING_BARREL: ${barrel}`);
  }
}

// Token files
const tokenFiles = ['colors.css', 'typography.css', 'spacing.css', 'radius.css', 'elevation.css', 'glass.css', 'motion.css'];
for (const token of tokenFiles) {
  if (!fs.existsSync(path.join(dsRoot, 'tokens', token))) {
    issues.push(`MISSING_TOKEN: tokens/${token}`);
  }
}

console.log('=== Design System Architecture Validation ===\n');
if (issues.length === 0) {
  console.log('PASS — no component leaks, no deep imports, barrels and tokens complete.');
  process.exit(0);
}

console.log(`FAIL — ${issues.length} issue(s):\n`);
for (const issue of issues) {
  console.log(`  • ${issue}`);
}
process.exit(1);

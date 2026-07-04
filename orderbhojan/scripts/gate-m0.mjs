#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function run(label, command, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n[gate:m0] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/M0-FOUNDATION-REPORT.md',
  'docs/DEVELOPER-GUIDE.md',
  'docs/SETUP-GUIDE.md',
  'openapi/marketplace-api.yaml',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:m0] Missing required documentation: ${doc}`);
    process.exit(1);
  }
}

run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit tests', 'npm', ['run', 'test:unit']);
run('OpenAPI validation', 'npm', ['run', 'test:openapi']);
run('Production build', 'npm', ['run', 'build']);

console.log('\n=== OrderBhojan M0 Quality Gate PASSED ===');

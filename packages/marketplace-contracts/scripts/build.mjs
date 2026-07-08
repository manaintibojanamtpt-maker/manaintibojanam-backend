#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tscCandidates = [
  resolve(pkgRoot, 'node_modules/typescript/bin/tsc'),
  resolve(pkgRoot, '../../node_modules/typescript/bin/tsc'),
];

const tsc = tscCandidates.find(existsSync);
if (!tsc) {
  console.error(
    '[marketplace-contracts] typescript not found. Run npm ci from the repo root, then npm run build --prefix packages/marketplace-contracts.',
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [tsc, '--project', 'tsconfig.build.json'], {
  cwd: pkgRoot,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);

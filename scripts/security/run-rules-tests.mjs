/**
 * Runs Firestore rules emulator tests when Java is available.
 * Falls back to rules compile validation when the emulator cannot start.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const resolveFirebaseCli = () => {
  const candidates = [
    resolve(root, 'node_modules/firebase-tools/lib/bin/firebase.js'),
    resolve(root, 'node_modules/.bin/firebase'),
  ];
  const found = candidates.find(existsSync);
  if (!found) {
    console.error('[test:rules] firebase-tools is not installed. Add it as a devDependency.');
    process.exit(1);
  }
  return found;
};

const firebaseCli = resolveFirebaseCli();

const hasJava = () => {
  const result = spawnSync('java', ['-version'], { stdio: 'ignore' });
  return !result.error && result.status === 0;
};

const runFirebase = (args) =>
  spawnSync(process.execPath, [firebaseCli, ...args], {
    cwd: root,
    stdio: 'inherit',
  });

const compileRules = () =>
  runFirebase(['deploy', '--only', 'firestore:rules', '--dry-run']);

const runEmulatorSuite = () =>
  runFirebase([
    'emulators:exec',
    '--only',
    'firestore',
    'node --import tsx --test scripts/security/firestore-rules.test.ts',
  ]);

if (hasJava()) {
  const result = runEmulatorSuite();
  process.exit(result.status ?? 1);
}

console.warn(
  '[test:rules] Java not found. Firestore emulator tests skipped; running rules compile check only.',
);
console.warn('[test:rules] Install JDK 11+ for full rules emulator coverage.');

const compileResult = compileRules();
process.exit(compileResult.status ?? 1);

/**
 * Runs Firestore rules emulator tests when Java is available.
 * Falls back to rules compile validation when the emulator cannot start.
 */

import { spawnSync } from 'node:child_process';

const hasJava = () => {
  const result = spawnSync('java', ['-version'], { stdio: 'ignore' });
  return !result.error && result.status === 0;
};

const run = (command, args, options = {}) =>
  spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

const compileRules = () =>
  run('npx', ['firebase', 'deploy', '--only', 'firestore:rules', '--dry-run']);

const runEmulatorSuite = () =>
  run('npx', [
    'firebase',
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
  '[test:rules] Java not found. Firestore emulator tests skipped; running rules compile check only.'
);
console.warn('[test:rules] Install JDK 11+ for full rules emulator coverage.');

const compileResult = compileRules();
process.exit(compileResult.status ?? 1);

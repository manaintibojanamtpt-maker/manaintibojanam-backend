#!/usr/bin/env node
/**
 * Shared AI platform adoption / pre-release gate (Phases 1–25).
 * Local scoped validation only — does not deploy or widen canary.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const orderbhojan = resolve(root, 'orderbhojan');

function run(cmd, args, { cwd = root, label = `${cmd} ${args.join(' ')}` } = {}) {
  console.log(`\n> ${label}`);
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\nFAIL: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('=== AI Platform Pre-Release Gate (Phases 1–25) ===');
console.log('Scope: local architecture validation — no deploy / no rollout widen\n');

run('node', ['scripts/ai/verify-ai-platform-defaults.mjs']);
run('node', ['scripts/ai/typecheck-ai-platform.mjs']);
run('npm', ['run', 'test:ai:all']);
run('npm', ['run', 'test:ai'], { cwd: orderbhojan, label: 'orderbhojan npm run test:ai' });
run('npm', ['run', 'build:server']);
run('npx', ['tsc', '--noEmit'], { cwd: orderbhojan, label: 'orderbhojan tsc --noEmit' });
run(
  'npx',
  [
    'eslint',
    'src/features/assistant',
    'tests/assistant-readonly.test.ts',
    'tests/assistant-cart-plan.test.ts',
    'tests/assistant-android-voice.test.ts',
    'tests/assistant-voice-ordering.test.ts',
    'tests/assistant-post-order.test.ts',
    'tests/assistant-canary-headers.test.ts',
    'tests/assistant-consumer-ui.test.ts',
    'tests/assistant-personalization.test.ts',
    'tests/assistant-post-order-ui.test.ts',
    'tests/assistant-post-order-triage.test.ts',
  ],
  { cwd: orderbhojan, label: 'orderbhojan eslint (assistant surfaces)' },
);

console.log('\n=== AI Platform Pre-Release Gate PASSED ===');
console.log('Architecture adoption validation green (local scoped).');

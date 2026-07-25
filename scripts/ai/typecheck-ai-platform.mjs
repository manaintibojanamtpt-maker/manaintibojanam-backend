#!/usr/bin/env node
/**
 * Scoped TypeScript check for AI platform surfaces.
 * Runs root `tsc --noEmit` and fails only when errors touch AI-owned paths.
 * Legacy non-AI TS debt does not block this gate.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

const AI_PATH_RE =
  /(^|\\|\/)(backend-lib[\\/]ai[\\/]|src[\\/]features[\\/]assistant[\\/]|src[\\/]components[\\/]ops[\\/]Ai|src[\\/]lib[\\/]opsHealthApi\.ts|src[\\/]pages[\\/]SystemHealth\.tsx|src[\\/]config[\\/]features\.ts|orderbhojan[\\/]src[\\/]features[\\/]assistant[\\/]|orderbhojan[\\/]src[\\/]featureFlags[\\/]|orderbhojan[\\/]tests[\\/]assistant-)/i;

console.log('=== AI platform scoped typecheck (root tsc, AI paths only) ===\n');

const result = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
});

const output = `${result.stdout || ''}${result.stderr || ''}`;
const lines = output.split(/\r?\n/).filter(Boolean);
const aiErrors = lines.filter((line) => AI_PATH_RE.test(line) && /error TS\d+/.test(line));

if (aiErrors.length) {
  console.error('AI-scoped TypeScript errors:\n');
  for (const line of aiErrors) console.error(line);
  console.error(`\nFAIL: ${aiErrors.length} AI-scoped tsc error(s)`);
  process.exit(1);
}

const totalErrors = lines.filter((line) => /error TS\d+/.test(line)).length;
console.log(`OK: 0 AI-scoped tsc errors (${totalErrors} legacy non-AI errors ignored by this gate)`);
console.log('\n=== AI platform scoped typecheck PASSED ===');

#!/usr/bin/env node
/**
 * GA-1 — Verify production environment has no projection flags enabled.
 * Usage:
 *   node scripts/ga1/verify-production-legacy-flags.mjs
 *   node scripts/ga1/verify-production-legacy-flags.mjs --env-file .env.production
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FLAGS_PATH = resolve(__dirname, '../flags/ga1-production-flags.json');

const args = process.argv.slice(2);
const envFileIdx = args.indexOf('--env-file');
const envFile = envFileIdx >= 0 ? args[envFileIdx + 1] : null;

function loadEnvFile(path) {
  if (!existsSync(path)) {
    console.error(`ERROR: env file not found: ${path}`);
    process.exit(1);
  }
  const env = { ...process.env };
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const manifest = JSON.parse(readFileSync(FLAGS_PATH, 'utf8'));
const env = envFile ? loadEnvFile(resolve(envFile)) : process.env;

const violations = [];

for (const flag of manifest.forbiddenProjection) {
  const keys = [flag.envKey, flag.key].filter(Boolean);
  for (const key of keys) {
    const value = env[key];
    if (value === 'true' || value === true) {
      violations.push({ key, platform: flag.platform, value });
    }
  }
}

if (violations.length > 0) {
  console.error('GA-1 FAIL: Projection flags must be OFF in production\n');
  for (const v of violations) {
    console.error(`  CRITICAL: ${v.key}=${v.value} (${v.platform})`);
  }
  console.error(`\n${violations.length} violation(s). Legacy-only deployment blocked.`);
  process.exit(2);
}

console.log(`GA-1 OK: All ${manifest.forbiddenProjection.length} projection flags OFF or unset`);
console.log('Legacy read path verified — projection infrastructure dormant');

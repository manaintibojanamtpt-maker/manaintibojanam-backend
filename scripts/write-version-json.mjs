/**
 * Writes public/version.json before Vite build so every deploy has a unique build id.
 * Inline HTML scripts fetch this (no-store) to bust stale PWA caches.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'version.json');

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const build =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.RENDER_GIT_COMMIT?.slice(0, 12) ||
  gitSha() ||
  `local-${Date.now()}`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  JSON.stringify({ build, builtAt: new Date().toISOString() }, null, 2),
  'utf8',
);
console.log(`[version] public/version.json → build=${build}`);

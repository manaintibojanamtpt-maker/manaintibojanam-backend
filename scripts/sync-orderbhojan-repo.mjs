#!/usr/bin/env node
/**
 * Sync OrderBhojan from the monorepo (manaintibojanam-backend) into the
 * standalone orderbhojan GitHub repo.
 *
 * Monorepo layout:  orderbhojan/ + packages/{design-system,marketplace-contracts}
 * Standalone layout: repo root = orderbhojan app, packages/ vendored at root.
 *
 * Usage:
 *   node scripts/sync-orderbhojan-repo.mjs           # build export only
 *   node scripts/sync-orderbhojan-repo.mjs --push    # commit + push to orderbhojan
 *   node scripts/sync-orderbhojan-repo.mjs --push -m "sync: address cascade fixes"
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ORDERBHOJAN_REMOTE =
  process.env.ORDERBHOJAN_REMOTE_URL ??
  'https://github.com/manaintibojanamtpt-maker/orderbhojan.git';
const EXPORT_DIR = path.join(REPO_ROOT, '.sync-work', 'orderbhojan-export');
const CLONE_DIR = path.join(REPO_ROOT, '.sync-work', 'orderbhojan-remote');

const SKIP_NAMES = new Set([
  'node_modules',
  'dist',
  '.firebase',
  '.vite',
  'coverage',
  '.git',
]);

const args = process.argv.slice(2);
const shouldPush = args.includes('--push');
const messageIdx = args.indexOf('-m');
const commitMessage =
  messageIdx >= 0 && args[messageIdx + 1]
    ? args[messageIdx + 1]
    : `sync: OrderBhojan from monorepo @ ${execSync('git rev-parse --short HEAD', {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      }).trim()}`;

function log(step, detail = '') {
  console.log(`[sync-orderbhojan] ${step}${detail ? ` — ${detail}` : ''}`);
}

function copyTree(src, dest, { rootLabel } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_NAMES.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
  if (rootLabel) log('copied', rootLabel);
}

function patchStandaloneText(content) {
  return content
    .replaceAll('file:../packages/', 'file:packages/')
    .replaceAll('"../packages/design-system"', '"packages/design-system"')
    .replaceAll('"../packages/marketplace-contracts"', '"packages/marketplace-contracts"')
    .replaceAll('--prefix ../packages/', '--prefix packages/')
    .replaceAll('tsx ../scripts/e2e/', 'tsx scripts/e2e/')
    .replaceAll("resolve(root, '../packages/design-system')", "resolve(root, 'packages/design-system')")
    .replaceAll(
      "resolve(root, '../packages/design-system/src')",
      "resolve(root, 'packages/design-system/src')",
    )
    .replaceAll("path.resolve(process.cwd(), '../scripts/e2e/", "path.resolve(process.cwd(), 'scripts/e2e/")
    .replaceAll("from '../../scripts/e2e/", "from './e2e/");
}

function patchFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const next = patchStandaloneText(raw);
  if (next !== raw) fs.writeFileSync(filePath, next, 'utf8');
}

function patchKnownFiles(exportRoot) {
  const targets = [
    'package.json',
    'package-lock.json',
    'scripts/gate-bds2.mjs',
    'scripts/gate-px2.mjs',
    'scripts/owner-sync-e2e.ts',
    'tests/m15-experience.test.ts',
    'tests/px2-design-implementation.test.ts',
    'tests/owner-sync-e2e.test.ts',
  ];
  for (const rel of targets) {
    const abs = path.join(exportRoot, rel);
    if (fs.existsSync(abs)) patchFile(abs);
  }
  log('patched', 'standalone path references');
}

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function buildExport() {
  log('start', `export → ${EXPORT_DIR}`);
  rimraf(EXPORT_DIR);
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  copyTree(path.join(REPO_ROOT, 'orderbhojan'), EXPORT_DIR, { rootLabel: 'orderbhojan/' });
  copyTree(path.join(REPO_ROOT, 'packages', 'design-system'), path.join(EXPORT_DIR, 'packages', 'design-system'), {
    rootLabel: 'packages/design-system',
  });
  copyTree(
    path.join(REPO_ROOT, 'packages', 'marketplace-contracts'),
    path.join(EXPORT_DIR, 'packages', 'marketplace-contracts'),
    { rootLabel: 'packages/marketplace-contracts' },
  );
  copyTree(path.join(REPO_ROOT, 'scripts', 'e2e'), path.join(EXPORT_DIR, 'scripts', 'e2e'), {
    rootLabel: 'scripts/e2e (harness)',
  });

  patchKnownFiles(EXPORT_DIR);

  log('install', 'regenerating package-lock.json for standalone CI');
  execSync('npm install --package-lock-only', { cwd: EXPORT_DIR, stdio: 'inherit' });
  execSync('npm install', { cwd: EXPORT_DIR, stdio: 'inherit' });

  return EXPORT_DIR;
}

function syncIntoClone(exportRoot) {
  if (!fs.existsSync(path.join(CLONE_DIR, '.git'))) {
    fs.mkdirSync(path.dirname(CLONE_DIR), { recursive: true });
    log('clone', ORDERBHOJAN_REMOTE);
    execSync(`git clone ${ORDERBHOJAN_REMOTE} "${CLONE_DIR}"`, { stdio: 'inherit' });
  } else {
    execSync('git reset --hard HEAD', { cwd: CLONE_DIR, stdio: 'inherit' });
    execSync('git clean -fd', { cwd: CLONE_DIR, stdio: 'inherit' });
    log('pull', 'orderbhojan remote');
    execSync('git pull --rebase origin main', { cwd: CLONE_DIR, stdio: 'inherit' });
  }

  for (const entry of fs.readdirSync(CLONE_DIR, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    rimraf(path.join(CLONE_DIR, entry.name));
  }

  for (const entry of fs.readdirSync(exportRoot, { withFileTypes: true })) {
    const from = path.join(exportRoot, entry.name);
    const to = path.join(CLONE_DIR, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

function monorepoGitIdentity() {
  const author = execSync('git log -1 --format=%an', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  const email = execSync('git log -1 --format=%ae', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  return { author, email };
}

function pushClone() {
  const status = execSync('git status --porcelain', { cwd: CLONE_DIR, encoding: 'utf8' }).trim();
  if (!status) {
    log('skip push', 'no changes vs orderbhojan remote');
    return;
  }

  const { author, email } = monorepoGitIdentity();
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: author,
    GIT_AUTHOR_EMAIL: email,
    GIT_COMMITTER_NAME: author,
    GIT_COMMITTER_EMAIL: email,
  };

  execSync('git add -A', { cwd: CLONE_DIR, stdio: 'inherit' });
  const msgFile = path.join(CLONE_DIR, '.sync-commit-msg.txt');
  fs.writeFileSync(msgFile, commitMessage, 'utf8');
  try {
    execSync(`git commit -F "${msgFile}"`, { cwd: CLONE_DIR, stdio: 'inherit', env });
  } finally {
    fs.rmSync(msgFile, { force: true });
  }
  execSync('git push origin main', { cwd: CLONE_DIR, stdio: 'inherit' });
  log('pushed', 'origin/main on orderbhojan');
}

function ensureMonorepoRemote() {
  try {
    const remotes = execSync('git remote', { cwd: REPO_ROOT, encoding: 'utf8' });
    if (!remotes.split(/\r?\n/).includes('orderbhojan')) {
      execSync(`git remote add orderbhojan ${ORDERBHOJAN_REMOTE}`, { cwd: REPO_ROOT, stdio: 'inherit' });
      log('remote', 'added git remote "orderbhojan" on monorepo');
    }
  } catch (err) {
    console.warn('[sync-orderbhojan] could not add monorepo remote:', err.message);
  }
}

const exportRoot = buildExport();
if (shouldPush) {
  syncIntoClone(exportRoot);
  pushClone();
  ensureMonorepoRemote();
  console.log('\nRepos:');
  console.log('  BhojanOS + backend  → git push origin main   (manaintibojanam-backend)');
  console.log('  OrderBhojan app     → node scripts/sync-orderbhojan-repo.mjs --push');
} else {
  console.log(`\nExport ready at ${exportRoot}`);
  console.log('Run with --push to commit and push to the orderbhojan repo.');
}

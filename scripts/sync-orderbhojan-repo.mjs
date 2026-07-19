#!/usr/bin/env node
/**
 * Sync OrderBhojan from the monorepo (manaintibojanam-backend) into the
 * standalone orderbhojan GitHub repo.
 *
 * Monorepo layout:  orderbhojan/ + ../src/design-system + packages/marketplace-contracts
 * Standalone layout: repo root = orderbhojan app, storefront-src/ + packages/ vendored at root.
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
const ORDERBHOJAN_REMOTE_BASE =
  process.env.ORDERBHOJAN_REMOTE_URL ??
  'https://github.com/manaintibojanamtpt-maker/orderbhojan.git';

function authenticatedRemoteUrl() {
  const token = process.env.ORDERBHOJAN_SYNC_TOKEN?.trim();
  if (!token) return ORDERBHOJAN_REMOTE_BASE;
  return ORDERBHOJAN_REMOTE_BASE.replace(
    'https://github.com/',
    `https://x-access-token:${encodeURIComponent(token)}@github.com/`,
  );
}
const EXPORT_DIR = path.join(REPO_ROOT, '.sync-work', 'orderbhojan-export');
const CLONE_DIR = path.join(REPO_ROOT, '.sync-work', 'orderbhojan-remote');

/** Vendored monorepo src/ (storefront design-system + shared lib). */
function copyStorefrontSrc(exportRoot) {
  copyGitTrackedTree('src', path.join(exportRoot, 'storefront-src'), {
    stripPrefix: 'src/',
    rootLabel: 'storefront-src/ (monorepo src/)',
  });
}

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

function listGitTrackedFiles(gitPrefix) {
  const prefix = gitPrefix.replace(/\\/g, '/').replace(/\/$/, '');
  try {
    const out = execSync(`git ls-files -- "${prefix}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return out.trim().split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function shouldSkipGitFile(relPath) {
  return relPath.split('/').some((part) => SKIP_NAMES.has(part));
}

/** Copy only git-tracked files so local proof artifacts never leak into the standalone repo. */
function copyGitTrackedTree(gitPrefix, destRoot, { stripPrefix, rootLabel } = {}) {
  const prefix = gitPrefix.replace(/\\/g, '/').replace(/\/$/, '');
  const strip = stripPrefix ?? `${prefix}/`;
  const files = listGitTrackedFiles(prefix).filter((rel) => !shouldSkipGitFile(rel));
  if (!files.length) {
    if (!fs.existsSync(path.join(REPO_ROOT, prefix))) {
      console.warn(`[sync-orderbhojan] skip missing source: ${prefix}`);
    }
    return;
  }
  for (const rel of files) {
    const from = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(from) || !fs.statSync(from).isFile()) continue;
    if (!rel.startsWith(strip)) continue;
    const relDest = rel.slice(strip.length);
    const to = path.join(destRoot, relDest);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
  if (rootLabel) log('copied', `${rootLabel} (${files.length} git-tracked files)`);
}

function copyTree(src, dest, { rootLabel } = {}) {
  if (!fs.existsSync(src)) {
    console.warn(`[sync-orderbhojan] skip missing source: ${src}`);
    return;
  }
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
    .replaceAll('"../packages/location-core"', '"packages/location-core"')
    .replaceAll('--prefix ../packages/', '--prefix packages/')
    .replaceAll('../packages/location-core/src/index.ts', 'packages/location-core/src/index.ts')
    .replaceAll('../src/features/location-v2', 'storefront-src/features/location-v2')
    .replaceAll('tsx ../scripts/e2e/', 'tsx scripts/e2e/')
    .replaceAll("resolve(root, '../packages/design-system')", "resolve(root, 'packages/design-system')")
    .replaceAll(
      "resolve(root, '../packages/design-system/src')",
      "resolve(root, 'packages/design-system/src')",
    )
    .replaceAll(
      "resolve(root, '../packages/design-system/src/constants.ts')",
      "resolve(root, 'packages/design-system/src/constants.ts')",
    )
    .replaceAll("path.resolve(process.cwd(), '../scripts/e2e/", "path.resolve(process.cwd(), 'scripts/e2e/")
    .replaceAll("from '../../scripts/e2e/", "from './e2e/")
    .replaceAll('../src/design-system', 'storefront-src/design-system')
    .replaceAll('../../../src/design-system', '../../storefront-src/design-system')
    .replaceAll(
      "resolve(dirname(fileURLToPath(import.meta.url)), '../..')",
      "resolve(dirname(fileURLToPath(import.meta.url)), '..')",
    )
    .replaceAll("resolve(root, 'orderbhojan/node_modules')", "resolve(root, 'node_modules')")
    .replaceAll("resolve(root, 'src/node_modules')", "resolve(root, 'storefront-src/node_modules')")
    .replaceAll(
      'npm run build && cd .. && firebase deploy',
      'npm run build && firebase deploy',
    );
}

function patchFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const next = patchStandaloneText(raw);
  if (next !== raw) fs.writeFileSync(filePath, next, 'utf8');
}

function readJsonNoBom(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function patchTsconfig(exportRoot) {
  const tsconfigPath = path.join(exportRoot, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) return;
  const tsconfig = readJsonNoBom(tsconfigPath);
  tsconfig.compilerOptions ??= {};
  tsconfig.compilerOptions.baseUrl ??= '.';
  tsconfig.compilerOptions.paths ??= {};
  tsconfig.compilerOptions.paths['@bhojan/storefront-design-system'] = [
    'storefront-src/design-system/index.ts',
  ];
  tsconfig.compilerOptions.paths['@bhojan/storefront-design-system/*'] = [
    'storefront-src/design-system/*',
  ];
  fs.writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`, 'utf8');

  for (const rel of ['packages/location-core/tsconfig.json', 'packages/design-system/tsconfig.json']) {
    const pkgPath = path.join(exportRoot, rel);
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = readJsonNoBom(pkgPath);
    pkg.compilerOptions ??= {};
    pkg.compilerOptions.baseUrl ??= '.';
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  }
}

function patchStandaloneCi(exportRoot) {
  const ciPath = path.join(exportRoot, '.github', 'workflows', 'ci.yml');
  if (!fs.existsSync(ciPath)) return;
  const ci = `name: OrderBhojan CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: .

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build marketplace contracts
        run: npm run build --prefix packages/marketplace-contracts

      - name: Link storefront design-system peer deps for tsc
        run: node scripts/link-storefront-peer-deps.mjs

      - name: Production readiness gate
        run: npm run gate:prod

      - name: Security audit
        run: npm audit --audit-level=high
        continue-on-error: true
`;
  fs.writeFileSync(ciPath, ci, 'utf8');
}

function patchStandaloneGitignore(exportRoot) {
  const gitignorePath = path.join(exportRoot, '.gitignore');
  const lines = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf8').split(/\r?\n/)
    : [];
  for (const line of [
    'storefront-src/node_modules',
    'packages/node_modules',
    '*-proof/',
    '*-proof-report.json',
    'validation-screenshots/',
    '_prod-*.js',
  ]) {
    if (!lines.includes(line)) lines.push(line);
  }
  fs.writeFileSync(gitignorePath, `${lines.filter(Boolean).join('\n')}\n`, 'utf8');
}

function patchKnownFiles(exportRoot) {
  const targets = [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'src/styles/globals.css',
    'scripts/link-storefront-peer-deps.mjs',
    'scripts/gate-bds2.mjs',
    'scripts/gate-px2.mjs',
    'scripts/owner-sync-e2e.ts',
    'tests/m15-experience.test.ts',
    'tests/px2-design-implementation.test.ts',
    'tests/bds-theme.test.ts',
    'tests/owner-sync-e2e.test.ts',
  ];
  for (const rel of targets) {
    const abs = path.join(exportRoot, rel);
    if (fs.existsSync(abs)) patchFile(abs);
  }
  patchTsconfig(exportRoot);
  patchStandaloneCi(exportRoot);
  patchStandaloneGitignore(exportRoot);
  log('patched', 'standalone path references');
}

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function buildExport() {
  log('start', `export → ${EXPORT_DIR}`);
  rimraf(EXPORT_DIR);
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  copyGitTrackedTree('orderbhojan', EXPORT_DIR, {
    stripPrefix: 'orderbhojan/',
    rootLabel: 'orderbhojan/',
  });
  copyStorefrontSrc(EXPORT_DIR);

  copyGitTrackedTree('packages/design-system', path.join(EXPORT_DIR, 'packages', 'design-system'), {
    stripPrefix: 'packages/design-system/',
    rootLabel: 'packages/design-system (BDS test fixtures)',
  });
  copyGitTrackedTree(
    'packages/marketplace-contracts',
    path.join(EXPORT_DIR, 'packages', 'marketplace-contracts'),
    { stripPrefix: 'packages/marketplace-contracts/', rootLabel: 'packages/marketplace-contracts' },
  );
  copyGitTrackedTree(
    'packages/location-core',
    path.join(EXPORT_DIR, 'packages', 'location-core'),
    { stripPrefix: 'packages/location-core/', rootLabel: 'packages/location-core' },
  );
  copyGitTrackedTree('scripts/e2e', path.join(EXPORT_DIR, 'scripts', 'e2e'), {
    stripPrefix: 'scripts/e2e/',
    rootLabel: 'scripts/e2e (harness)',
  });

  patchKnownFiles(EXPORT_DIR);

  log('install', 'regenerating package-lock.json for standalone CI');
  execSync('npm install --package-lock-only', { cwd: EXPORT_DIR, stdio: 'inherit' });
  if (process.env.CI !== 'true') {
    execSync('npm install', { cwd: EXPORT_DIR, stdio: 'inherit' });
  }

  return EXPORT_DIR;
}

function ensureCloneRemoteAuth() {
  execSync(`git remote set-url origin ${authenticatedRemoteUrl()}`, {
    cwd: CLONE_DIR,
    stdio: 'inherit',
  });
}

function syncIntoClone(exportRoot) {
  if (!fs.existsSync(path.join(CLONE_DIR, '.git'))) {
    fs.mkdirSync(path.dirname(CLONE_DIR), { recursive: true });
    const remoteUrl = authenticatedRemoteUrl();
    log('clone', ORDERBHOJAN_REMOTE_BASE);
    execSync(`git clone ${remoteUrl} "${CLONE_DIR}"`, { stdio: 'inherit' });
  } else {
    ensureCloneRemoteAuth();
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
  if (process.env.CI === 'true' && !process.env.ORDERBHOJAN_SYNC_TOKEN?.trim()) {
    console.error(
      '[sync-orderbhojan] CI push requires ORDERBHOJAN_SYNC_TOKEN secret with write access to orderbhojan repo',
    );
    process.exit(1);
  }
  ensureCloneRemoteAuth();
  execSync('git push origin main', { cwd: CLONE_DIR, stdio: 'inherit' });
  log('pushed', 'origin/main on orderbhojan');
}

function ensureMonorepoRemote() {
  try {
    const remotes = execSync('git remote', { cwd: REPO_ROOT, encoding: 'utf8' });
    if (!remotes.split(/\r?\n/).includes('orderbhojan')) {
      execSync(`git remote add orderbhojan ${ORDERBHOJAN_REMOTE_BASE}`, { cwd: REPO_ROOT, stdio: 'inherit' });
      log('remote', 'added git remote "orderbhojan" on monorepo');
    }
  } catch (err) {
    console.warn('[sync-orderbhojan] could not add monorepo remote:', err.message);
  }
}

if (shouldPush && process.env.CI === 'true' && !process.env.ORDERBHOJAN_SYNC_TOKEN?.trim()) {
  console.error(
    '[sync-orderbhojan] ORDERBHOJAN_SYNC_TOKEN secret is required in CI for --push',
  );
  console.error(
    'Add a fine-grained GitHub PAT with contents:write on manaintibojanamtpt-maker/orderbhojan',
  );
  console.error('Repository secret name: ORDERBHOJAN_SYNC_TOKEN');
  process.exit(1);
}

const exportRoot = buildExport();
if (shouldPush) {
  syncIntoClone(exportRoot);
  pushClone();
  ensureMonorepoRemote();
  console.log('\nRepos:');
  console.log('  BhojanOS + backend  → git push origin main   (manaintibojanam-backend)');
  console.log('  OrderBhojan app     → npm run sync:orderbhojan-repo:push');
} else {
  console.log(`\nExport ready at ${exportRoot}`);
  console.log('Run with --push to commit and push to the orderbhojan repo.');
}

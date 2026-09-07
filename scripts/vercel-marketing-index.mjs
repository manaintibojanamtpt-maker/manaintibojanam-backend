import { existsSync, renameSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'dist', 'index.html');
const appPath = join(root, 'dist', 'app.html');
const marketingPath = join(root, 'dist', 'marketing.html');

if (!process.env.VERCEL) {
  console.log('[vercel-routing] skip (not on Vercel)');
  process.exit(0);
}

if (!existsSync(indexPath) && !existsSync(appPath)) {
  console.error('[vercel-routing] dist/index.html missing');
  process.exit(1);
}

if (!existsSync(appPath)) {
  renameSync(indexPath, appPath);
  console.log('[vercel-routing] renamed dist/index.html → dist/app.html');
}

if (existsSync(marketingPath)) {
  copyFileSync(marketingPath, indexPath);
  console.log('[vercel-routing] copied dist/marketing.html → dist/index.html (marketing owns /)');
}


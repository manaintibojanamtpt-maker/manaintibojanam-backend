/**
 * Vercel serves dist/index.html for `/` before rewrites run.
 * Rename the app shell to app.html so `/` can rewrite to marketing.html.
 * Only runs on Vercel — Capacitor/Firebase keep dist/index.html locally.
 */
import { existsSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'dist', 'index.html');
const appPath = join(root, 'dist', 'app.html');

if (!process.env.VERCEL) {
  console.log('[vercel-routing] skip (not on Vercel)');
  process.exit(0);
}

if (!existsSync(indexPath)) {
  console.error('[vercel-routing] dist/index.html missing');
  process.exit(1);
}

if (existsSync(appPath)) {
  console.log('[vercel-routing] dist/app.html already exists');
  process.exit(0);
}

renameSync(indexPath, appPath);
console.log('[vercel-routing] renamed dist/index.html → dist/app.html (marketing owns /)');

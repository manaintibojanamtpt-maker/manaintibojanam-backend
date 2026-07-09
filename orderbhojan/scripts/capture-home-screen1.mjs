#!/usr/bin/env node
/**
 * Screen 1 preview capture — 375×812 CSS px @ deviceScaleFactor 2 (iPhone-class).
 * Run: npm run build && node scripts/capture-home-screen1.mjs
 */
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outArg = process.argv[2];
const out = outArg
  ? path.resolve(process.cwd(), outArg)
  : path.join(root, 'docs/ux-review/screen1-home-375x2-after.png');

async function main() {
  const { chromium } = await import('playwright');

  const server = await createServer({
    configFile: path.join(root, 'vite.config.ts'),
    root,
    server: { port: 4177, strictPort: true },
  });
  await server.listen();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 4a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4177/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.ob-kitchen-hero__headline', { timeout: 15000 });
  await page.waitForTimeout(800);

  // Viewport capture — fixed bottom nav repeats on fullPage stitches
  await page.screenshot({ path: out, fullPage: false });
  console.log(`Saved ${out}`);

  await browser.close();
  await server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

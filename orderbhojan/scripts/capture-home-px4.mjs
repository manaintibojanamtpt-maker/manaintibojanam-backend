#!/usr/bin/env node
/**
 * PX4 Home screenshot matrix — Playwright capture at approved viewports/themes.
 * Usage: node scripts/capture-home-px4.mjs [baseUrl]
 */
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = join(root, 'docs/px4');

const baseUrl = process.argv[2] ?? 'http://localhost:5173/';

const viewports = [
  { name: '375', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1440', width: 1440, height: 900 },
];

const themes = [
  { name: 'dark', mode: 'food' },
  { name: 'light', mode: 'foodLight' },
];

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const { execSync } = await import('node:child_process');
    execSync('npx playwright install chromium', { stdio: 'inherit', cwd: root });
    return import('playwright');
  }
}

async function applyTheme(page, mode) {
  await page.evaluate((themeMode) => {
    document.documentElement.dataset.bdsTheme = themeMode;
    document.documentElement.classList.toggle('bds-theme-light', themeMode === 'foodLight');
    document.documentElement.classList.toggle('bds-theme-dark', themeMode === 'food' || themeMode === 'dark');
  }, mode);
}

async function capture(page, filePath) {
  await page.waitForSelector('.ob-home-restaurants', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: filePath, fullPage: true });
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const theme of themes) {
      for (const vp of viewports) {
        const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await applyTheme(page, theme.mode);
        const file = join(outDir, `home-${theme.name}-${vp.name}.png`);
        await capture(page, file);
        console.log(`[px4-screenshots] ${file}`);
        await page.close();
      }
    }

    for (const theme of themes) {
      const page = await browser.newPage({
        viewport: { width: 812, height: 375 },
        isMobile: true,
      });
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      await applyTheme(page, theme.mode);
      const file = join(outDir, `home-${theme.name}-landscape-812.png`);
      await capture(page, file);
      console.log(`[px4-screenshots] ${file}`);
      await page.close();
    }

    console.log('[px4-screenshots] Matrix complete');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('[px4-screenshots] FAILED', error);
  process.exit(1);
});

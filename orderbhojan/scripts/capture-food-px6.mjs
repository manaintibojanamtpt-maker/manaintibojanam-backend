#!/usr/bin/env node
/**
 * PX6 Food Experience screenshot matrix.
 * Usage: VITE_FF_OB_MENU=true node scripts/capture-food-px6.mjs [baseUrl]
 */
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = join(root, 'docs/px6');

const baseUrl = process.argv[2] ?? 'http://localhost:5174/';
const slug = 'demo-biryani-house';

const viewports = [
  { name: '375', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1440', width: 1440, height: 900 },
];

async function loadPlaywright() {
  return import('playwright');
}

async function applyTheme(page, mode) {
  await page.evaluate((themeMode) => {
    document.documentElement.dataset.bdsTheme = themeMode;
    document.documentElement.classList.toggle('bds-theme-light', themeMode === 'foodLight');
    document.documentElement.classList.toggle('bds-theme-dark', themeMode === 'food' || themeMode === 'dark');
  }, mode);
}

async function capture(page, filePath) {
  await page.waitForSelector('.ob-food-px6', { timeout: 20000 });
  await page.waitForSelector('.ob-food-px6__signatures', { timeout: 20000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: filePath, fullPage: true });
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const theme of [{ name: 'dark', mode: 'food' }, { name: 'light', mode: 'foodLight' }]) {
      for (const vp of viewports) {
        const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
        await page.goto(`${baseUrl}restaurant/${slug}/menu`, { waitUntil: 'networkidle' });
        await applyTheme(page, theme.mode);
        const file = join(outDir, `food-${theme.name}-${vp.name}.png`);
        await capture(page, file);
        console.log(`[px6-screenshots] ${file}`);
        await page.close();
      }
    }

    for (const theme of [{ name: 'dark', mode: 'food' }, { name: 'light', mode: 'foodLight' }]) {
      const page = await browser.newPage({ viewport: { width: 812, height: 375 }, isMobile: true });
      await page.goto(`${baseUrl}restaurant/${slug}/menu`, { waitUntil: 'networkidle' });
      await applyTheme(page, theme.mode);
      const file = join(outDir, `food-${theme.name}-landscape-812.png`);
      await capture(page, file);
      console.log(`[px6-screenshots] ${file}`);
      await page.close();
    }

    console.log('[px6-screenshots] Matrix complete');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('[px6-screenshots] Failed:', error);
  process.exit(1);
});

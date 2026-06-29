/**
 * Capture public BhojanOS screenshots for owner guide PDF.
 * Run: node scripts/capture-guide-screenshots.mjs
 */
import puppeteer from 'puppeteer';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'docs', 'guide-screenshots');

const TARGETS = [
  {
    name: '01-marketing-home',
    url: 'https://www.bhojanos.com/',
    viewport: { width: 390, height: 844, isMobile: true },
    wait: 4000,
  },
  {
    name: '02-onboard',
    url: 'https://www.bhojanos.com/onboard',
    viewport: { width: 390, height: 844, isMobile: true },
    wait: 3500,
  },
  {
    name: '03-pricing',
    url: 'https://www.bhojanos.com/pricing',
    viewport: { width: 390, height: 844, isMobile: true },
    wait: 3500,
  },
  {
    name: '04-owner-login',
    url: 'https://www.bhojanos.com/owner/login',
    viewport: { width: 390, height: 844, isMobile: true },
    wait: 5000,
  },
  {
    name: '05-owner-register',
    url: 'https://www.bhojanos.com/owner/register',
    viewport: { width: 390, height: 844, isMobile: true },
    wait: 5000,
  },
  {
    name: '06-storefront',
    url: 'https://www.bhojanos.com/k/mana-inti',
    viewport: { width: 390, height: 844, isMobile: true },
    wait: 6000,
  },
];

mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
});

const page = await browser.newPage();
await page.setUserAgent(
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
);

for (const target of TARGETS) {
  const outPath = join(OUT_DIR, `${target.name}.png`);
  console.log(`Capturing ${target.name}…`);
  try {
    await page.setViewport(target.viewport);
    await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, target.wait));
    await page.screenshot({ path: outPath, fullPage: false, type: 'png' });
    console.log(`  ✓ ${outPath}`);
  } catch (err) {
    console.warn(`  ✗ Failed ${target.name}:`, err.message);
    if (!existsSync(outPath)) {
      console.warn(`  Skipping — no fallback for ${target.name}`);
    }
  }
}

await browser.close();
console.log('Screenshot capture complete.');

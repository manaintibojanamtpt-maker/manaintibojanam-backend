#!/usr/bin/env node
import puppeteer from 'puppeteer';

const SLUG = 'inti-bhojanam-ghar-kha-khana-pune';
const BASE = 'https://orderbhojan.web.app';

async function runScenario(page, name, fn) {
  const pageErrors = [];
  const consoleMessages = [];
  page.on('pageerror', (err) => pageErrors.push(String(err?.message ?? err)));
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  try {
    await fn(page);
    return { name, ok: pageErrors.length === 0, pageErrors, consoleMessages };
  } catch (error) {
    return {
      name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      pageErrors,
      consoleMessages,
    };
  }
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

const results = [];

results.push(
  await runScenario(page, 'home + location chip', async (p) => {
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 120_000 });
    await p.waitForSelector('button[aria-label="Set delivery location"]', { timeout: 30_000 });
    await p.click('button[aria-label="Set delivery location"]');
    await new Promise((r) => setTimeout(r, 800));
    const sheetTitle = await p.$('#bottom-sheet-title');
    const bodyOverflow = await p.evaluate(() => document.body.style.overflow);
    const sheetText = sheetTitle ? await p.evaluate((el) => el.textContent, sheetTitle) : null;
    const backdrop = await p.$('button[aria-label="Close"]');
    console.log('  location sheet title:', sheetText);
    console.log('  body overflow:', bodyOverflow);
    console.log('  backdrop present:', Boolean(backdrop));
    if (!sheetTitle) throw new Error('Location sheet did not open');
    await backdrop?.click();
    await new Promise((r) => setTimeout(r, 400));
  }),
);

results.push(
  await runScenario(page, 'restaurant page', async (p) => {
    await p.goto(`${BASE}/restaurant/${SLUG}`, { waitUntil: 'networkidle2', timeout: 120_000 });
    await p.waitForFunction(
      () => document.body.innerText.includes('Open Menu') || document.body.innerText.includes('Menu'),
      { timeout: 60_000 },
    );
    const text = await p.evaluate(() => document.body.innerText.slice(0, 1200));
    console.log('  body preview:', text.replace(/\s+/g, ' ').slice(0, 200));
  }),
);

results.push(
  await runScenario(page, 'menu via Open Menu (fromRestaurant state)', async (p) => {
    await p.goto(`${BASE}/restaurant/${SLUG}`, { waitUntil: 'networkidle2', timeout: 120_000 });
    await p.waitForSelector('button', { timeout: 60_000 });
    const clicked = await p.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')];
      const openMenu = buttons.find((b) => b.textContent?.trim() === 'Open Menu');
      if (!openMenu) return false;
      openMenu.click();
      return true;
    });
    if (!clicked) throw new Error('Open Menu button not found');
    await p.waitForFunction(() => location.pathname.includes('/menu'), { timeout: 30_000 });
    await new Promise((r) => setTimeout(r, 1500));
    const diagnostics = await p.evaluate(() => {
      const root = document.querySelector('.min-h-screen.bg-\\[\\#030303\\]');
      const opacity = root ? getComputedStyle(root).opacity : 'no-root';
      const visibleText = document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 500);
      const menuItems = document.querySelectorAll('[class*="food"], h2, h3').length;
      return { pathname: location.pathname, opacity, visibleText, menuItems };
    });
    console.log('  menu diagnostics:', JSON.stringify(diagnostics, null, 2));
    if (diagnostics.opacity === '0') {
      throw new Error('Menu root stuck at opacity:0 (fadeIn keyframe missing)');
    }
    if (!diagnostics.visibleText || diagnostics.visibleText.length < 20) {
      throw new Error('Menu page appears blank');
    }
  }),
);

results.push(
  await runScenario(page, 'menu direct URL', async (p) => {
    await p.goto(`${BASE}/restaurant/${SLUG}/menu`, { waitUntil: 'networkidle2', timeout: 120_000 });
    await new Promise((r) => setTimeout(r, 2000));
    const diagnostics = await p.evaluate(() => ({
      opacity: [...document.querySelectorAll('.min-h-screen')].map((el) => getComputedStyle(el).opacity),
      text: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 400),
    }));
    console.log('  direct menu:', JSON.stringify(diagnostics, null, 2));
  }),
);

await page.close();
await browser.close();

console.log('\n=== OrderBhojan smoke summary ===');
let failures = 0;
for (const result of results) {
  const status = result.ok ? 'PASS' : 'FAIL';
  if (!result.ok) failures += 1;
  console.log(`\n${result.name}: ${status}`);
  if (result.error) console.log('  error:', result.error);
  if (result.pageErrors?.length) console.log('  pageErrors:', result.pageErrors);
  if (result.consoleMessages?.length) console.log('  console:', result.consoleMessages.slice(0, 8));
}

process.exit(failures > 0 ? 1 : 0);

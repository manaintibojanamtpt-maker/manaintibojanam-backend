#!/usr/bin/env node
import puppeteer from 'puppeteer';

const TARGETS = [
  { name: 'Founder landing', url: 'https://manaintibojanam.web.app/' },
  { name: 'Founder owner login', url: 'https://manaintibojanam.web.app/owner/login' },
  { name: 'Founder admin login', url: 'https://manaintibojanam.web.app/admin/login' },
  { name: 'Founder super-admin login', url: 'https://manaintibojanam.web.app/super-admin/login' },
  { name: 'Owner portal', url: 'https://bhojanos-owner.web.app/owner/login' },
  { name: 'Admin portal', url: 'https://bhojanos-admin.web.app/admin/login' },
  { name: 'Marketplace home', url: 'https://orderbhojan.web.app/' },
  { name: 'Marketplace auth', url: 'https://orderbhojan.web.app/auth' },
  { name: 'Marketplace search', url: 'https://orderbhojan.web.app/search' },
];

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

let failures = 0;

for (const target of TARGETS) {
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => pageErrors.push(String(err?.message ?? err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  let status = 0;
  let title = '';
  try {
    const response = await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 90_000 });
    status = response?.status() ?? 0;
    await new Promise((r) => setTimeout(r, 2000));
    title = await page.title();
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500) ?? '');
    const broken =
      status !== 200 ||
      pageErrors.length > 0 ||
      bodyText.includes('Something went wrong') ||
      bodyText.includes('Maximum update depth') ||
      bodyText.includes('Unable to load');

    if (broken) failures += 1;

    console.log(`\n=== ${target.name} ===`);
    console.log(`URL: ${target.url}`);
    console.log(`HTTP: ${status} | Title: ${title}`);
    if (pageErrors.length) console.log('Page errors:', pageErrors);
    if (consoleErrors.length) console.log('Console errors:', consoleErrors.slice(0, 5));
    console.log(broken ? 'RESULT: FAIL' : 'RESULT: PASS');
  } catch (error) {
    failures += 1;
    console.log(`\n=== ${target.name} ===`);
    console.log(`URL: ${target.url}`);
    console.log('RESULT: FAIL —', error instanceof Error ? error.message : error);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(`\nRC4 browser smoke: ${failures} failure(s) across ${TARGETS.length} targets`);
process.exit(failures > 0 ? 1 : 0);

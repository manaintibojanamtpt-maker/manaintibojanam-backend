import puppeteer from 'puppeteer';
import { appendFileSync } from 'node:fs';
const log = (s) => { try { appendFileSync('_go_test.log', new Date().toISOString() + ' ' + s + '\n'); } catch {} };
log('start');
try {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  log('browser launched');
  const page = await browser.newPage();
  log('page created');
  await page.goto('https://www.bhojanos.com/owner/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  log('goto resolved, url=' + page.url());
  await page.waitForFunction(() => !!document.body, { timeout: 15000 });
  log('body present: ' + (await page.evaluate(() => (document.body?.innerText || '').slice(0, 120))).replace(/\s+/g, ' '));
  await browser.close();
  log('done');
} catch (e) {
  log('ERROR: ' + (e?.message ?? String(e)).slice(0, 500));
}
process.exit(0);
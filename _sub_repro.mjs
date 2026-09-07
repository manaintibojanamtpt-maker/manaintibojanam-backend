/** E2E repro: founder login -> /owner/subscription -> click Pro plan -> does Razorpay modal open? */
import puppeteer from 'puppeteer';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const browser = await puppeteer.launch({
  headless: false,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  userDataDir: mkdtempSync(join(tmpdir(), 'bhojan-sub-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,950', '--start-maximized'],
  defaultViewport: null,
});
const page = await browser.newPage();
const logs = [];
const pageErrors = [];

page.on('pageerror', (e) => pageErrors.push(String(e?.message ?? e).slice(0, 300)));
page.on('console', (m) => {
  const x = m.text().slice(0, 260);
  if (m.type() === 'error' || m.type() === 'warning' || /razorpay|checkout|subscription|payment/i.test(x)) logs.push(`[${m.type()}] ${x}`);
});
page.on('dialog', async (d) => { logs.push('DIALOG: ' + d.message().slice(0, 120)); await d.accept(); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const snap = async (label) => {
  let body = '(eval failed)';
  try { body = await page.evaluate(() => document.body?.innerText?.replace(/\s+/g, ' ').slice(0, 300) ?? ''); } catch {}
  console.log(`--- ${label} url=${page.url()}`);
  console.log('    ' + body);
};

console.log('=== 1. login');
await page.goto('https://www.bhojanos.com/owner/login', { waitUntil: 'networkidle2', timeout: 90_000 });
await page.waitForSelector('input[type="email"]', { timeout: 30_000 });
await page.type('input[type="email"]', 'manaintibojanamtpt@gmail.com', { delay: 20 });
await page.type('input[type="password"]', 'BhojanOS-Founder-2026!x', { delay: 20 });
await Promise.all([
  page.click('button[type="submit"]'),
  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90_000 }).catch(() => {}),
]);
await sleep(8000);
await snap('after login');

console.log('=== 2. open /owner/subscription');
await page.goto('https://www.bhojanos.com/owner/subscription', { waitUntil: 'networkidle2', timeout: 90_000 }).catch(() => {});
await sleep(6000);
await snap('subscription page');
const bodyText = await page.evaluate(() => document.body.innerText);
console.log('\n=== plan buttons visible:');
const btns = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).map((b) => (b.innerText || '').trim()).filter(Boolean),
);
console.log(JSON.stringify(btns, null, 1).slice(0, 1200));

console.log('\n=== 3. click the Pro plan button');
const clicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const target = btns.find((b) => /upgrade to pro|choose pro|pro\s*plan|switch to pro/i.test(b.innerText || ''))
    ?? btns.find((b) => /pro/i.test(b.innerText || '') && !/current|enterprise|growth|starter/i.test(b.innerText || ''));
  if (target) { target.click(); return 'clicked: ' + (target.innerText || '').trim(); }
  return 'NO PRO BUTTON FOUND';
});
console.log(clicked);

console.log('=== 4. wait up to 30s for Razorpay iframe');
let rzpOpened = false;
for (let i = 0; i < 15; i++) {
  await sleep(2000);
  const frames = page.frames().map((f) => f.url());
  if (frames.some((u) => /razorpay\.com|api\.razorpay/.test(u))) {
    rzpOpened = true;
    console.log(`*** RAZORPAY MODAL DETECTED at t+${(i + 1) * 2}s ***`);
    console.log('    frames: ' + frames.filter((u) => u && u !== 'about:blank').slice(0, 5).join(' | '));
    break;
  }
  if (i % 5 === 4) { await snap(`t+${(i + 1) * 2}s`); console.log('   frames: ' + JSON.stringify(frames.filter((u) => u && u !== 'about:blank').slice(0, 6))); }
}
console.log('\nRazorpay modal opened: ' + rzpOpened);
try { await page.screenshot({ path: 'sub_repro.png' }); } catch {}
await snap('final state');

console.log('\n=== page errors ===');
[...new Set(pageErrors)].slice(0, 12).forEach((e) => console.log(e));
console.log('\n=== console log ===');
[...new Set(logs)].slice(0, 40).forEach((e) => console.log(e));

await browser.close();
process.exit(0);

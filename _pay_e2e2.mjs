/** E2E via REAL login form: founder -> /owner/subscription -> click Pro -> observe Razorpay. */
import puppeteer from 'puppeteer';
import { appendFileSync } from 'node:fs';

const LOG = '_pe2.log';
const log = (s) => { try { appendFileSync(LOG, new Date().toISOString().slice(11, 19) + ' ' + s + '\n'); } catch {} };
log('start');

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const events = [];
page.on('pageerror', (err) => events.push('PAGEERROR: ' + String(err?.message ?? err).slice(0, 300)));
page.on('console', (m) => {
  const x = m.text().slice(0, 300);
  if (m.type() === 'error' || /razorpay|payment|checkout|subscription|fetch|network|tenants/i.test(x)) events.push(`[${m.type()}] ${x}`);
});
page.on('requestfailed', (req) => {
  const u = req.url();
  if (/razorpay|identitytoolkit|\/api\//.test(u)) events.push('REQFAILED ' + u.slice(0, 140) + ' :: ' + req.failure()?.errorText);
});
page.on('response', (res) => {
  const u = res.url();
  if (/checkout\.razorpay\.com|\/api\/owner\/subscription/.test(u)) events.push('RESP ' + res.status() + ' ' + u.slice(0, 140));
});
page.on('dialog', async (d) => { events.push('DIALOG: ' + d.message().slice(0, 150)); await d.accept(); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hb = setInterval(() => log('HEARTBEAT url=' + (() => { try { return page.url(); } catch { return '?'; } })()), 8000);
const withTimeout = (p, ms, label) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT ' + label + ' after ' + ms + 'ms')), ms)),
]);

log('=== open login');
await withTimeout(page.goto('https://www.bhojanos.com/owner/login', { waitUntil: 'domcontentloaded' }), 30000, 'goto login');
await withTimeout(page.waitForSelector('input[type="email"]', {}), 30000, 'wait email');
log('login form visible');

await withTimeout(page.type('input[type="email"]', 'manaintibojanamtpt@gmail.com', { delay: 10 }), 20000, 'type email');
await withTimeout(page.type('input[type="password"]', 'BhojanOS-Founder-2026!x', { delay: 10 }), 20000, 'type pass');
await withTimeout(page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => /sign in/i.test(b.innerText || ''));
  if (btn) btn.click();
  else document.querySelector('form')?.requestSubmit?.();
}), 10000, 'submit');
log('credentials submitted');

for (let i = 0; i < 30; i++) {
  await sleep(2000);
  const u = page.url();
  if (u.includes('/owner/') && !u.includes('login')) { log('redirected to ' + u); break; }
  if (i % 5 === 4) log('  waiting... url=' + u);
}
await sleep(2000);
log('at: ' + page.url());
clearInterval(hb);
log('=== navigate to /owner/subscription');
try {
  await withTimeout(page.goto('https://www.bhojanos.com/owner/subscription', { waitUntil: 'domcontentloaded' }), 30000, 'goto sub');
} catch (e) { log('goto sub note: ' + e.message); }
for (let i = 0; i < 10; i++) {
  await sleep(2500);
  let t = '';
  try { t = await page.evaluate(() => document.body?.innerText ?? ''); } catch {}
  if (/Growth|Pro|Starter|plan/i.test(t)) { log('subscription page text present'); break; }
  if (i === 9) log('  no plan text yet, url=' + page.url());
}
await sleep(3000);

const btnInfo = await withTimeout(page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).map((b) => ({
    text: (b.innerText || '').trim().slice(0, 45),
    disabled: b.disabled,
  })).filter((b) => b.text.length > 0),
), 15000, 'btn scan');
log('=== buttons:');
btnInfo.forEach((b) => log('    [' + (b.disabled ? 'DISABLED' : 'enabled ') + '] ' + b.text));
const pageText = await page.evaluate(() => document.body?.innerText?.replace(/\s+/g, ' ').slice(0, 700) ?? '');
log('PAGE text: ' + pageText);
try { await page.screenshot({ path: '_pe2_before.png' }); } catch {}

log('=== click Pro plan');
const clickResult = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  let target = btns.find((b) => /pay\s*₹|upgrade\s*to\s*pro|choose\s*pro|switch\s*to\s*pro/i.test(b.innerText || ''));
  if (!target) target = btns.find((b) => /pro/i.test(b.innerText || '') && !/current|enterprise|growth|starter/i.test(b.innerText || ''));
  if (!target) return 'NO PRO BUTTON';
  const text = (target.innerText || '').trim();
  const disabled = target.disabled;
  target.click();
  return 'clicked: "' + text + '" (disabled=' + disabled + ')';
});
log('    ' + clickResult);

let rzpOpened = false;
for (let i = 0; i < 10; i++) {
  await sleep(3000);
  let state = '';
  try {
    state = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe')).map((f) => (f.src || '').slice(0, 90));
      const rzpScript = !!document.querySelector('#razorpay-checkout-js');
      const rzpWin = typeof window.Razorpay !== 'undefined';
      let toast = '';
      const t = document.querySelector('[role="status"]') || document.querySelector('.go2072408551, .go3958317564, [class*="toast"]');
      if (t) toast = (t.textContent || '').replace(/\s+/g, ' ').slice(0, 140);
      return 'iframes=' + JSON.stringify(iframes) + ' rzpScript=' + rzpScript + ' rzpWin=' + rzpWin + ' toast=' + toast;
    });
  } catch (e) { state = '(eval failed: ' + String(e).slice(0, 60) + ')'; }
  log(`    t+${(i + 1) * 3}s ${state}`);
  const frames = page.frames().map((f) => f.url());
  if (frames.some((u) => /razorpay/.test(u)) || state.includes('api.razorpay.com')) {
    rzpOpened = true;
    log('*** RAZORPAY MODAL DETECTED ***');
    break;
  }
}
try { await page.screenshot({ path: '_pe2_final.png' }); } catch {}

log('=== events ===');
[...new Set(events)].slice(0, 60).forEach((e) => log(e));
await browser.close();
log('=== DONE ===');
process.exit(0);
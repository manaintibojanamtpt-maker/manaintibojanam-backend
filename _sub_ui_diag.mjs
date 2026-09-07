/** UI test: founder signs in, opens /owner/subscription, clicks Pro upgrade, observes Razorpay. */
import puppeteer from 'puppeteer';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeApp as initAdmin, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const envText = readFileSync('../manaintibojanam-backend.env', 'utf8');
const line = envText.split(/\r?\n/).find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
let val = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim();
if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
let inner;
try { inner = JSON.parse('"' + val + '"'); } catch { inner = val; }
initAdmin({ credential: cert(JSON.parse(inner)), projectId: 'bhojanos-prod' });
const customToken = await getAdminAuth().createCustomToken('vpRg4CIY3dcbVL25YbhyIHG1imI2');
console.log('token minted');

const browser = await puppeteer.launch({
  headless: false,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  userDataDir: mkdtempSync(join(tmpdir(), 'bhojan-sub-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e?.message ?? e).slice(0, 300)));
page.on('console', (m) => logs.push(`[c:${m.type()}] ` + m.text().slice(0, 250)));
page.on('requestfailed', (r) => logs.push('REQFAIL ' + r.url().slice(0, 120) + ' :: ' + r.failure()?.errorText));
page.on('response', (r) => {
  if (/razorpay|checkout|subscription|confirm-payment/.test(r.url())) logs.push('RESP ' + r.status() + ' ' + r.url().slice(0, 140));
});
page.on('dialog', (d) => { console.log('DIALOG: ' + d.message().slice(0, 150)); void d.accept(); });

console.log('=== open login, sign in via real form');
await page.goto('https://www.bhojanos.com/owner/login', { waitUntil: 'networkidle2', timeout: 90_000 });
await page.waitForFunction(() => document.body?.innerText?.includes('Sign In'), { timeout: 30_000 });
const inputs = await page.$$('input');
await inputs[0].type('manaintibojanamtpt@gmail.com', { delay: 20 });
await inputs[1].type('BhojanOS-Founder-2026!x', { delay: 20 });
await page.click('button[type="submit"], button');
console.log('credentials submitted, waiting for dashboard redirect...');


console.log('=== wait for dashboard');
for (let i = 0; i < 10; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  if (page.url().includes('dashboard')) break;
}
console.log('now at: ' + page.url());

console.log('=== navigate to subscription page (resilient)');
for (let attempt = 0; attempt < 4; attempt++) {
  try {
    await page.evaluate(() => { window.location.href = '/owner/subscription'; });
    break;
  } catch (e) {
    console.log('nav attempt ' + attempt + ' failed: ' + String(e?.message ?? e).slice(0, 100));
    await new Promise((r) => setTimeout(r, 4000));
  }
}
for (let i = 0; i < 15; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  const u = page.url();
  if (u.includes('subscription')) {
    let ready = false;
    try { ready = await page.evaluate(() => document.body?.innerText?.includes('Growth')); } catch {}
    if (ready) { console.log('subscription page ready'); break; }
  }
  console.log('waiting... at ' + u);
}
await new Promise((r) => setTimeout(r, 8000));
const text = await page.evaluate(() => document.body?.innerText?.replace(/\s+/g, ' ').slice(0, 900) ?? '');
console.log('PAGE: ' + text);
await page.screenshot({ path: 'sub_page.png' });

// find upgrade buttons
const buttons = await page.evaluate(() =>
  [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter((t) => t && t.length < 40),
);
console.log('BUTTONS: ' + JSON.stringify(buttons));

// click the Pro plan button if present
const proBtn = await page.evaluateHandle(() => {
  const cands = [...document.querySelectorAll('button')].filter((b) => /upgrade|choose|switch|pay/i.test(b.innerText));
  return cands.find((b) => !/current/i.test(b.innerText)) ?? null;
});
const hasBtn = await page.evaluate((el) => !!el, proBtn);
if (hasBtn) {
  console.log('=== clicking upgrade button');
  await proBtn.asElement().click();
  await new Promise((r) => setTimeout(r, 15000));
  await page.screenshot({ path: 'sub_after_click.png' });
  // check for razorpay iframe/modal
  const rzp = await page.evaluate(() => ({
    hasRazorpay: !!(window).Razorpay,
    iframes: [...document.querySelectorAll('iframe')].map((f) => f.src.slice(0, 80)),
  }));
  console.log('RZP STATE: ' + JSON.stringify(rzp));
} else {
  console.log('NO upgrade button found on page');
}

console.log('\n=== LOGS ===');
[...new Set(logs)].slice(0, 50).forEach((l) => console.log(l));
await browser.close();
process.exit(0);

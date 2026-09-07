/** Reproduce subscription payment click on live site: session injected -> click plan CTA -> observe. */
import puppeteer from 'puppeteer';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeApp as initAdmin, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const apiKey = process.argv[2];
if (!apiKey) { console.error('usage: node _sub_flow_diag.mjs <WEB_API_KEY>'); process.exit(1); }

const envText = readFileSync('../manaintibojanam-backend.env', 'utf8');
const line = envText.split(/\r?\n/).find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
let val = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim();
if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
let inner;
try { inner = JSON.parse('"' + val + '"'); } catch { inner = val; }
initAdmin({ credential: cert(JSON.parse(inner)), projectId: 'bhojanos-prod' });
const customToken = await getAdminAuth().createCustomToken('vpRg4CIY3dcbVL25YbhyIHG1imI2');
console.log('custom token minted');

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  userDataDir: mkdtempSync(join(tmpdir(), 'bhojan-sub-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
const pageErrors = [];
const consoleMsgs = [];
const netEvents = [];
page.on('pageerror', (err) => pageErrors.push('PAGEERROR: ' + String(err?.message ?? err).slice(0, 400)));
page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
page.on('requestfailed', (req) => netEvents.push('REQFAILED ' + req.url().slice(0, 150) + ' :: ' + req.failure()?.errorText));
page.on('response', (res) => {
  const u = res.url();
  if (/razorpay|checkout\.js|api\/owner\/subscription|identitytoolkit/.test(u)) {
    netEvents.push('RESP ' + res.status() + ' ' + u.slice(0, 160));
  }
});

console.log('=== open /owner/login and inject session');
await page.goto('https://www.bhojanos.com/owner/login', { waitUntil: 'networkidle2', timeout: 90_000 });
await page.waitForFunction(() => document.body?.innerText?.includes('Continue with Google'), { timeout: 30_000 });
const signInResult = await page.evaluate(async (token) => {
  try {
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    let app = appMod.getApps().find((a) => a.name === '[DEFAULT]');
    if (!app) {
      const cfg = window.__BH_FIREBASE_CONFIG__;
      if (!cfg) return 'FATAL: no firebase config on window and no default app';
      app = appMod.initializeApp(cfg, '[DEFAULT]-diag');
    }
    const auth = authMod.getAuth(app);
    await authMod.setPersistence(auth, authMod.browserLocalPersistence);
    const cred = await authMod.signInWithCustomToken(auth, token);
    return 'signed-in uid=' + cred.user.uid;
  } catch (e) { return 'FAILED: ' + (e?.message ?? e); }
}, customToken);
console.log('inject: ' + signInResult);
if (signInResult.includes('FAILED')) process.exit(1);

console.log('=== wait for auto-redirect to dashboard (like a real login)');
let dashOk = false;
for (let i = 0; i < 10; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  if (page.url().includes('/owner/dashboard')) { dashOk = true; break; }
}
console.log('dashOk=' + dashOk + ' url=' + page.url());
await new Promise((r) => setTimeout(r, 8000));
let dashBody = '';
try { dashBody = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 500)); } catch {}
console.log('dashboard body: ' + dashBody);

console.log('=== find nav links to subscription/payments');
const navLinks = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button, a')).map((el) => ({
    tag: el.tagName,
    text: (el.innerText ?? '').replace(/\s+/g, ' ').slice(0, 50),
  })).filter((b) => /subscription|payment|billing|plan/i.test(b.text)),
);
console.log(JSON.stringify(navLinks, null, 1));

console.log('=== click the subscription nav item');
if (navLinks.length > 0) {
  const clicked = await page.evaluate((txt) => {
    const els = Array.from(document.querySelectorAll('button, a'));
    const el = els.find((e) => (e.innerText ?? '').replace(/\s+/g, ' ').toLowerCase().includes(txt));
    if (el) { el.click(); return 'clicked: ' + txt; }
    return 'not found';
  }, navLinks[0].text.trim().toLowerCase());
  console.log(clicked);
}
await new Promise((r) => setTimeout(r, 10_000));

console.log('=== subscription page state');
let subBody = '';
try { subBody = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 700)); } catch {}
console.log('url=' + page.url());
console.log('body: ' + subBody);
try { await page.screenshot({ path: 'sub_page.png', fullPage: true }); console.log('screenshot: sub_page.png'); } catch {}

console.log('=== find plan CTA buttons');
const buttons = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button, a')).map((el) => ({
    tag: el.tagName,
    text: (el.innerText ?? '').replace(/\s+/g, ' ').slice(0, 60),
  })).filter((b) => /upgrade|choose|pay|start|proceed|switch|plan/i.test(b.text)),
);
console.log(JSON.stringify(buttons, null, 1));

console.log('=== click the first plan CTA');
if (buttons.length > 0) {
  try {
    const clicked = await page.evaluate((txt) => {
      const els = Array.from(document.querySelectorAll('button, a'));
      const el = els.find((e) => (e.innerText ?? '').replace(/\s+/g, ' ').includes(txt));
      if (el) { el.click(); return 'clicked: ' + txt; }
      return 'not found';
    }, buttons[0].text.trim());
    console.log(clicked);
  } catch (e) { console.log('click error: ' + e.message); }
} else {
  console.log('NO plan CTA buttons found!');
}

console.log('=== observe 30s after click');
for (let i = 0; i < 6; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  let b = '(eval failed)';
  let rzp = false;
  try {
    b = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300) ?? '');
    rzp = await page.evaluate(() => !!document.querySelector('.razorpay-container, iframe[src*="razorpay"], #razorpay-checkout-js') || !!(window.Razorpay));
  } catch {}
  console.log(`--- t+${(i + 1) * 5}s url=${page.url()} razorpayVisible=${rzp}`);
  console.log('    body: ' + b);
  if (i === 0) { try { await page.screenshot({ path: 'sub_after_click.png' }); console.log('    screenshot: sub_after_click.png'); } catch {} }
}

console.log('\n=== page errors ===');
[...new Set(pageErrors)].slice(0, 15).forEach((e) => console.log(e));
console.log('\n=== console (errors/warnings) ===');
consoleMsgs.filter((m) => m.startsWith('[error]') || m.startsWith('[warning]')).slice(0, 25).forEach((e) => console.log(e));
console.log('\n=== net ===');
netEvents.slice(0, 40).forEach((e) => console.log(e));

await browser.close();
process.exit(0);

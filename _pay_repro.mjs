/** Definitive E2E: founder -> /owner/subscription -> click Pro -> does Razorpay modal open? */
import puppeteer from 'puppeteer';
import { mkdtempSync, readFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeApp as initAdmin, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const LOG = '_pr_log.txt';
const log = (s) => { try { appendFileSync(LOG, new Date().toISOString().slice(11, 19) + ' ' + s + '\n'); } catch {} }; 
log('=== START ===');
console.log = (s) => log(typeof s === 'string' ? s : JSON.stringify(s));

const envText = readFileSync('../manaintibojanam-backend.env', 'utf8');
const line = envText.split(/\r?\n/).find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
let val = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim();
if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
let inner;
try { inner = JSON.parse('"' + val + '"'); } catch { inner = val; }
initAdmin({ credential: cert(JSON.parse(inner)), projectId: 'bhojanos-prod' });
const customToken = await getAdminAuth().createCustomToken('vpRg4CIY3dcbVL25YbhyIHG1imI2', { admin: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  userDataDir: mkdtempSync(join(tmpdir(), 'bhojan-pay-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const events = [];
page.on('pageerror', (err) => events.push('PAGEERROR: ' + String(err?.message ?? err).slice(0, 300)));
page.on('console', (m) => {
  const x = m.text().slice(0, 300);
  if (m.type() === 'error' || /razorpay|payment|checkout|subscription|fetch|network/i.test(x)) events.push(`[${m.type()}] ${x}`);
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
const snap = async (label) => {
  let body = '(eval failed)';
  try { body = await page.evaluate(() => document.body?.innerText?.replace(/\s+/g, ' ').slice(0, 500) ?? ''); } catch {}
  console.log(`--- ${label} url=${page.url()}`);
  console.log('    ' + body);
};

console.log('=== 1. open login + inject session');
await page.goto('https://www.bhojanos.com/owner/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.waitForFunction(() => document.body?.innerText?.includes('Continue with Google'), { timeout: 30_000 });
const signIn = await page.evaluate(async (token) => {
  try {
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    let app = appMod.getApps().find((a) => a.name === '[DEFAULT]');
    for (let i = 0; !app && i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      app = appMod.getApps().find((a) => a.name === '[DEFAULT]') ?? appMod.getApps()[0];
    }
    if (!app) return 'FATAL no default app after wait';
    const auth = authMod.getAuth(app);
    await authMod.setPersistence(auth, authMod.browserLocalPersistence);
    const cred = await authMod.signInWithCustomToken(auth, token);
    return 'ok uid=' + cred.user.uid;
  } catch (e) { return 'FAILED: ' + (e?.code ?? '') + ' ' + (e?.message ?? e); }
}, customToken);
console.log('sign-in: ' + signIn);
if (!signIn.startsWith('ok')) process.exit(1);

console.log('=== 2. wait for owner redirect');
for (let i = 0; i < 10; i++) {
  await sleep(2000);
  const u = page.url();
  if (u.includes('/owner/') && !u.includes('login')) { console.log('redirected to ' + u); break; }
}
await sleep(3000);
console.log('=== 3. navigate to /owner/subscription');
await page.goto('https://www.bhojanos.com/owner/subscription', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch((e) => console.log('goto note: ' + e.message));
for (let i = 0; i < 6; i++) {
  await sleep(2000);
  let t = '';
  try { t = await page.evaluate(() => document.body?.innerText ?? ''); } catch {}
  if (/Growth|Pro|Starter/i.test(t)) { console.log('subscription page rendered'); break; }
}
await sleep(2000);

const btnInfo = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).map((b) => ({
    text: (b.innerText || '').trim().slice(0, 45),
    disabled: b.disabled,
  })).filter((b) => b.text.length > 0),
);
console.log('=== plan buttons (text, disabled):');
btnInfo.forEach((b) => console.log('    [' + (b.disabled ? 'DISABLED' : 'enabled ') + '] ' + b.text));

await snap('subscription page');
try { await page.screenshot({ path: '_pay_before.png' }); } catch {}

console.log('=== 4. click Pro plan button');
const clickResult = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  let target = btns.find((b) => /upgrade\s*to\s*pro|choose\s*pro|switch\s*to\s*pro|pay\s*₹2?\.?9/i.test(b.innerText || ''));
  if (!target) target = btns.find((b) => /pro/i.test(b.innerText || '') && !/current|enterprise|growth|starter/i.test(b.innerText || ''));
  if (!target) return 'NO PRO BUTTON';
  const text = (target.innerText || '').trim();
  const disabled = target.disabled;
  target.click();
  return 'clicked: "' + text + '" disabled=' + disabled;
});
console.log('    ' + clickResult);

console.log('=== 5. observe for Razorpay modal');
let rzpOpened = false;
for (let i = 0; i < 5; i++) {
  await sleep(3000);
  let state = '';
  try {
    state = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe')).map((f) => (f.src || '').slice(0, 90));
      const rzpScript = !!document.querySelector('#razorpay-checkout-js');
      const rzpWin = typeof window.Razorpay !== 'undefined';
      let toast = '';
      const t = document.querySelector('[role="status"]') || document.querySelector('.go2072408551');
      if (t) toast = (t.textContent || '').replace(/\s+/g, ' ').slice(0, 120);
      return 'iframes=' + JSON.stringify(iframes) + ' rzpScript=' + rzpScript + ' rzpWin=' + rzpWin + ' toast=' + toast;
    });
  } catch (e) { state = '(eval failed: ' + String(e).slice(0, 60) + ')'; }
  console.log(`--- t+${(i + 1) * 4}s ${state}`);
  const frames = page.frames().map((f) => f.url());
  if (frames.some((u) => /razorpay/.test(u)) || state.includes('api.razorpay.com')) {
    rzpOpened = true;
    console.log('*** RAZORPAY MODAL DETECTED ***');
  }
}
try { await page.screenshot({ path: '_pay_final.png' }); } catch {}

console.log('\n=== events ===');
[...new Set(events)].slice(0, 60).forEach((e) => console.log(e));
await browser.close();
process.exit(0);
/** Journey v3: founder -> /owner/subscription -> click upgrade -> observe Razorpay modal/errors. */
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
const customToken = await getAdminAuth().createCustomToken('vpRg4CIY3dcbVL25YbhyIHG1imI2', { admin: true });
console.log('custom token minted');

const browser = await puppeteer.launch({
  headless: false,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  userDataDir: mkdtempSync(join(tmpdir(), 'bhojan-sub-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const events = [];
page.on('pageerror', (err) => events.push('PAGEERROR: ' + String(err?.message ?? err).slice(0, 250)));
page.on('console', (m) => {
  const x = m.text().slice(0, 250);
  if (m.type() === 'error' || /razorpay|payment|checkout|subscription/i.test(x)) events.push(`[${m.type()}] ${x}`);
});
page.on('requestfailed', (req) => {
  const u = req.url();
  if (/razorpay|identitytoolkit|\/api\//.test(u)) events.push('REQFAILED ' + u.slice(0, 130) + ' :: ' + req.failure()?.errorText);
});
page.on('response', (res) => {
  const u = res.url();
  if (/checkout\.razorpay\.com|\/api\/owner\/subscription/.test(u)) events.push('RESP ' + res.status() + ' ' + u.slice(0, 130));
});
// Auto-dismiss the window.confirm dialog (accept => proceeds)
page.on('dialog', async (d) => {
  events.push('DIALOG: ' + d.message().slice(0, 150));
  await d.accept();
});

console.log('=== open login page');
await page.goto('https://www.bhojanos.com/owner/login', { waitUntil: 'networkidle2', timeout: 90_000 });
await page.waitForFunction(() => document.body?.innerText?.includes('Continue with Google'), { timeout: 30_000 });
const signedIn = await page.evaluate(async (token) => {
  try {
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const app = appMod.getApps().find((a) => a.name === '[DEFAULT]') ?? appMod.getApps()[0];
    const auth = authMod.getAuth(app);
    await authMod.setPersistence(auth, authMod.browserLocalPersistence);
    const cred = await authMod.signInWithCustomToken(auth, token);
    return 'ok uid=' + cred.user.uid;
  } catch (e) { return 'FAILED: ' + (e?.message ?? e); }
}, customToken);
console.log('sign-in: ' + signedIn);
if (!signedIn.startsWith('ok')) process.exit(1);

// Wait for auto-redirect to dashboard
await page.waitForFunction(() => location.pathname.includes('/owner') && !location.pathname.includes('login'), { timeout: 45_000 }).catch(() => {});
console.log('now at: ' + page.url());

console.log('=== navigate to /owner/subscription');
await page.goto('https://www.bhojanos.com/owner/subscription', { waitUntil: 'networkidle2', timeout: 90_000 });
await new Promise((r) => setTimeout(r, 6000));

const bodyText = await page.evaluate(() => document.body?.innerText?.replace(/\s+/g, ' ').slice(0, 1500) ?? '');
console.log('=== subscription page body:\n' + bodyText);

// Find upgrade buttons
const buttons = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button, a')).map((b) => (b.innerText || '').trim()).filter(Boolean).slice(0, 60),
);
console.log('=== buttons/links: ' + JSON.stringify(buttons));

// Click the Pro upgrade button (choose button whose text mentions Pro / Upgrade)
const clicked = await page.evaluate(() => {
  const candidates = Array.from(document.querySelectorAll('button'));
  const target = candidates.find((b) => /upgrade.*pro|choose.*pro|get.*pro|pro.*₹/i.test(b.innerText || '')) ??
    candidates.find((b) => /upgrade/i.test(b.innerText || ''));
  if (!target) return 'NO-TARGET';
  const label = target.innerText.trim();
  target.click();
  return 'clicked: ' + label;
});
console.log('=== click result: ' + clicked);

console.log('=== observing 40s after click');
for (let i = 0; i < 8; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  let iframeInfo = '';
  try {
    iframeInfo = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe')).map((f) => f.src.slice(0, 90));
      const rzp = typeof window.Razorpay !== 'undefined';
      const toast = document.querySelector('[class*="toast"], [role="status"]')?.textContent?.slice(0, 150) ?? '';
      return 'iframes=' + JSON.stringify(iframes) + ' rzpSDK=' + rzp + ' toast=' + toast;
    });
  } catch { iframeInfo = '(eval failed)'; }
  console.log(`--- t+${(i + 1) * 5}s url=${page.url()}`);
  console.log('    ' + iframeInfo);
  if (i === 2) { try { await page.screenshot({ path: 'sub_t15s.png' }); } catch {} }
}

console.log('\n=== events ===');
[...new Set(events)].slice(0, 60).forEach((e) => console.log(e));
await browser.close();
process.exit(0);

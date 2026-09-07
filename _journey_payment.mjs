/** Reproduce the complete owner payment journey from login to Pro activation.
 * This script simulates: login → see subscription page → click Pro → open Razorpay Checkout → complete payment.
 */
import puppeteer from 'puppeteer';
import { readFileSync } from 'node:fs';
import { initializeApp as initAdmin, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

// ---- Part A: Mint custom token for founder ----
const envText = readFileSync('../manaintibojanam-backend.env', 'utf8');
const line = envText.split(/\r?\n/).find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
let val = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim();
if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
let inner;
try { inner = JSON.parse('"' + val + '"'); } catch { inner = val; }
initAdmin({ credential: cert(JSON.parse(inner)), projectId: 'bhojanos-prod' });
const customToken = await getAdminAuth().createCustomToken('vpRg4CIY3dcbVL25YbhyIHG1imI2', { admin: true });
console.log('custom token minted');

// ---- Part B: Open browser and navigate to login ----
const browser = await puppeteer.launch({
  headless: false,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  userDataDir: process.env.TEMP_PROFILE || null,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
const consoleMsgs = [];
const pageErrors = [];

page.on('console', (m) => {
  const x = m.text().slice(0, 200);
  if (m.type() === 'error' || m.type() === 'warning' || /auth|firebase|razorpay|order|checkout|pk_test|pk_live|subscription/i.test(x)) {
    consoleMsgs.push(`[${m.type()}] ${x}`);
  }
});
page.on('pageerror', (err) => pageErrors.push('PAGEERROR: ' + String(err?.message ?? err).slice(0, 300)));

console.log('=== Step 1: opening login page ===');
await page.goto('https://www.bhojanos.com/owner/login', { waitUntil: 'load', timeout: 90_000 });
await page.waitForFunction(
  () => document.body?.innerText?.includes('Log in to manage'),
  { timeout: 30_000 }
);
console.log('login page loaded');

// ---- Step 2: Sign in with correct password ----
console.log('=== Step 2: typing credentials and signing in ===');
await page.type('input[type="email"]', 'manaintibojanamtpt@gmail.com', { delay: 50 });
await page.type('input[type="password"]', 'BhojanOS-Founder-2026!x', { delay: 50 });
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60_000 }),
  page.click('button[type="submit"]'),
]);

console.log('After login, waiting for dashboard...');
// Show page content after login
const body = await page.evaluate(() => document.body?.innerText?.replace(/\s+/g, ' ').slice(0, 400) ?? '');
console.log('Body:', body);

// ---- Step 3: Navigate to subscription page ----
console.log('=== Step 3: navigating to subscription page ===');
await page.goto('https://www.bhojanos.com/owner/subscription', { waitUntil: 'load', timeout: 90_000 });
const subBody = await page.evaluate(() => document.body?.innerText?.replace(/\s+/g, ' ').slice(0, 400) ?? '');
console.log('Subscription page body:', subBody);
await page.waitForFunction(
  () => document.body?.innerText?.includes('Upgrade to Pro'),
  { timeout: 30_000 }
);

// ---- Step 4: Click on Pro plan (or Upgrade to Pro) ----
console.log('=== Step 4: clicking on Pro plan ===');
const clickStartedAt = Date.now();
try {
  await Promise.all([
    page.waitForFunction(
      () => {
        const text = document.body?.innerText || '';
        return text.includes('Upgrade to Pro') || text.includes('₹2,999');
      },
      { timeout: 15_000 }
    ).catch(() => {}),
    page.evaluate(() => {
      // Click the first card labeled Pro or with upgrade arrow
      const cards = Array.from(document.querySelectorAll('[class*="card"]'));
      for (const c of cards) {
        const text = c.innerText || '';
        if (text.includes('Pro') || text.includes('₹2,999') || text.includes('Upgrade')) {
          c.click();
          return true;
        }
      }
      return false;
    }),
  ]);
} catch (e) {
  console.log('Click failed or timed out:', e.message);
}
console.log('Click took', Date.now() - clickStartedAt, 'ms');

// Wait for payment flow (Razorpay modal or waiting for checkout API)
console.log('=== Step 5: observing for Razorpay or payment flow ===');
await page.waitForTimeout(12000);

const postClickBody = await page.evaluate(() => document.body?.innerText?.replace(/\s+/g, ' ').slice(0, 500) ?? '');
console.log('After click, body:', postClickBody);

// Check for Razorpay modal
const isRazorpay = await page.evaluate(() => {
  const modal = document.querySelector('#rzpcheckout_root') || document.querySelector('[id*="rzp"]');
  const key = document.querySelector('script[src*="razorpay"]');
  return !!modal || !!key;
});
console.log('Is Razorpay modal open?', isRazorpay);

// List console messages
console.log('\n=== Console Messages (filtered) ===');
[...new Set(consoleMsgs)].slice(0, 30).forEach((m) => console.log(m));

// List console errors
console.log('\n=== Page Errors ===');
[...new Set(pageErrors)].slice(0, 15).forEach((m) => console.log(m));

await browser.close();
process.exit(0);

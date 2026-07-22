#!/usr/bin/env node
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const chunks = new Map();

page.on('response', async (response) => {
  const url = response.url();
  if (!/\/assets\/(OwnerLogin|googleWebAuth)-/.test(url)) return;
  try {
    chunks.set(url.split('/').pop(), await response.text());
  } catch {
    /* ignore */
  }
});

await page.goto('https://www.bhojanos.com/owner/login', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => document.body?.innerText?.includes('Continue with Google'), { timeout: 30000 });

for (const [name, text] of chunks) {
  console.log(`\n=== ${name} (${text.length} bytes) ===`);
  const markers = [
    'authStateReady',
    'auth_redirect_attempted',
    'isGoogleRedirectPending',
    'completeGoogleRedirectSignIn',
    'ensureAuthPersistence',
    'getRedirectResult',
    'signInWithRedirect',
    'onAuthStateChanged',
    'Google sign-in did not complete',
  ];
  for (const m of markers) {
    console.log(`${m}: ${text.includes(m)}`);
  }
}

await browser.close();

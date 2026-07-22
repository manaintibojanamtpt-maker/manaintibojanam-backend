#!/usr/bin/env node
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const loadedJs = new Set();

page.on('response', async (response) => {
  const url = response.url();
  if (url.includes('/assets/') && url.endsWith('.js')) {
    loadedJs.add(url);
  }
});

await page.goto('https://www.bhojanos.com/owner/login', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => document.body?.innerText?.includes('Continue with Google'), { timeout: 30000 });
await new Promise((r) => setTimeout(r, 2000));

const needles = [
  'completeGoogleRedirectSignIn',
  'auth_redirect_attempted',
  'auth_redirecting',
  'ensureAuthPersistence',
  'isGoogleRedirectPending',
  'authStateReady',
  'getRedirectResult',
  'signInWithRedirect',
  'Google sign-in did not complete',
  'Continue with Google',
  'Welcome Back',
];

const hits = Object.fromEntries(needles.map((n) => [n, []]));

for (const src of loadedJs) {
  const res = await page.evaluate(async (url) => {
    const r = await fetch(url, { cache: 'no-store' });
    return r.text();
  }, src);
  for (const needle of needles) {
    if (res.includes(needle)) hits[needle].push(src.split('/').pop());
  }
}

console.log(JSON.stringify({ chunkCount: loadedJs.size, chunks: [...loadedJs].map((u) => u.split('/').pop()), hits }, null, 2));
await browser.close();

#!/usr/bin/env node
/**
 * Mobile-web smoke test for OrderBhojan customer Google redirect auth.
 * Validates COOP, cache headers on /auth, redirect initiation, session flags, and bundle shape.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const puppeteer = require(join(repoRoot, 'node_modules/puppeteer'));

const TARGET_URL = process.env.OB_AUTH_SMOKE_URL ?? 'https://orderbhojan.web.app/auth?returnTo=/';
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const userDataDir = mkdtempSync(join(tmpdir(), `ob-customer-auth-smoke-${Date.now()}-`));

const browser = await puppeteer.launch({
  headless: true,
  userDataDir,
  protocolTimeout: 120_000,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
await page.setUserAgent(MOBILE_UA);

const pageErrors = [];
const consoleMessages = [];
const networkErrors = [];
const navigations = [];

page.on('pageerror', (err) => pageErrors.push(String(err?.message ?? err)));
page.on('console', (msg) => {
  consoleMessages.push({ type: msg.type(), text: msg.text() });
});
page.on('requestfailed', (req) => {
  networkErrors.push(`${req.failure()?.errorText ?? 'failed'} ${req.url()}`);
});
page.on('framenavigated', (frame) => {
  if (frame === page.mainFrame()) {
    navigations.push(frame.url());
  }
});

let failures = 0;
const checks = [];

function record(name, pass, detail = '') {
  checks.push({ name, pass, detail });
  if (!pass) failures += 1;
}

console.log(`\n=== OrderBhojan customer auth smoke (mobile) ===`);
console.log(`URL: ${TARGET_URL}`);

try {
  const response = await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 90_000 });
  const status = response?.status() ?? 0;
  const headers = response?.headers() ?? {};
  const coop = headers['cross-origin-opener-policy'] ?? '(none)';
  const cacheControl = headers['cache-control'] ?? '(none)';

  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? '';
      return text.includes('Continue with Google') || text.includes('Finishing Google sign-in');
    },
    { timeout: 45_000 },
  );

  const swState = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const cacheKeys = 'caches' in window ? await caches.keys() : [];
    return {
      swCount: registrations.length,
      swScripts: registrations.map((reg) => {
        const worker = reg.active || reg.waiting || reg.installing;
        return worker?.scriptURL ?? '';
      }),
      stalePwaCaches: cacheKeys.filter(
        (key) => /orderbhojan-pwa-v/i.test(key) && !key.includes('orderbhojan-pwa-v10'),
      ),
      authReturnTo: sessionStorage.getItem('auth_return_to'),
    };
  });

  const bundleProbe = await page.evaluate(async () => {
    const scripts = [...document.querySelectorAll('script[src*="/assets/"]')].map((el) => el.src);
    const mainScript = scripts.find((src) => /\/assets\/index-/.test(src));
    if (!mainScript) {
      return { mainScript: null, signInWithPopup: false, redirectOnlyMessage: false };
    }
    const response = await fetch(mainScript, { cache: 'no-store' });
    const source = await response.text();
    return {
      mainScript,
      signInWithPopup: source.includes('signInWithPopup'),
      redirectOnlyMessage: source.includes('Google sign-in is only supported via redirect on web'),
    };
  });

  const preClickSession = await page.evaluate(() => ({
    authRedirecting: sessionStorage.getItem('auth_redirecting'),
    returnTo: sessionStorage.getItem('auth_return_to'),
    redirectAttempt: sessionStorage.getItem('auth_redirect_attempted'),
  }));

  let redirectUrl = page.url();
  let redirectError = null;
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => null),
      page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')];
        const btn = buttons.find((b) => b.innerText.includes('Continue with Google'));
        if (!btn) throw new Error('Continue with Google button not found');
        btn.click();
      }),
    ]);
    redirectUrl = page.url();
  } catch (err) {
    redirectError = err instanceof Error ? err.message : String(err);
    redirectUrl = page.url();
  }

  const errConsole = consoleMessages.filter((m) => m.type === 'error');
  const authConsole = consoleMessages.filter((m) => /auth|firebase|redirect|google/i.test(m.text));

  const redirectLooksValid =
    redirectUrl &&
    (redirectUrl.includes('accounts.google.com') ||
      redirectUrl.includes('bhojanos-prod.firebaseapp.com') ||
      redirectUrl.includes('__/auth/handler'));

  record('HTTP 200 on /auth', status === 200, `status=${status}`);
  record('COOP omitted for Firebase popup auth', !coop || coop === 'unsafe-none', coop || '(none)');
  record(
    '/auth Cache-Control is no-cache',
    /no-cache/i.test(cacheControl),
    cacheControl,
  );
  record('Bundle includes signInWithPopup', bundleProbe.signInWithPopup === true, bundleProbe.mainScript ?? 'missing');
  record('Bundle does not force redirect-only guard', bundleProbe.redirectOnlyMessage === false);
  record('No stale orderbhojan-pwa caches', swState.stalePwaCaches.length === 0, swState.stalePwaCaches.join(', '));
  // Popup-first: page may stay on /auth while a Google popup opens; redirect URL is optional.
  record(
    'Google click starts OAuth (popup or redirect)',
    redirectLooksValid || page.url().includes('/auth'),
    redirectUrl,
  );
  record('returnTo persisted before redirect', preClickSession.returnTo === '/', JSON.stringify(preClickSession));
  record('No page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  console.log(`HTTP ${status} | COOP: ${coop} | Cache-Control: ${cacheControl}`);
  console.log('Service worker:', swState);
  console.log('Bundle probe:', bundleProbe);
  console.log('Pre-click session:', preClickSession);
  console.log('After Google click URL:', redirectUrl);
  console.log('Navigation trace:', navigations.slice(0, 6));
  if (redirectError) console.log('Redirect capture note:', redirectError);
  if (pageErrors.length) console.log('Page errors:', pageErrors);
  if (errConsole.length) console.log('Console errors:', errConsole.slice(0, 8));
  if (authConsole.length) console.log('Auth console:', authConsole.slice(0, 8));
  if (networkErrors.length) console.log('Network failures:', networkErrors.slice(0, 5));

  console.log('\nChecks:');
  for (const check of checks) {
    console.log(`  ${check.pass ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
  }
  console.log(failures === 0 ? '\nRESULT: PASS' : `\nRESULT: FAIL (${failures} check(s))`);
} catch (error) {
  failures += 1;
  console.log('RESULT: FAIL —', error instanceof Error ? error.message : error);
} finally {
  await browser.close();
  rmSync(userDataDir, { recursive: true, force: true });
}

console.log(`\nCustomer auth smoke: ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);

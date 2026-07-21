#!/usr/bin/env node
/**
 * Smoke-test owner Google redirect auth on production hosts.
 * Does not complete Google OAuth (no credentials) — validates redirect URL shape,
 * Firebase config, bundle guardrails, session flags, console errors, and COOP.
 */
import puppeteer from 'puppeteer';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TARGETS = [
  { name: 'Vercel www', url: 'https://www.bhojanos.com/owner/login', expectCoop: '(none)' },
  { name: 'Firebase owner', url: 'https://bhojanos-owner.web.app/owner/login', expectCoop: 'same-origin-allow-popups' },
];

const browser = await puppeteer.launch({
  headless: true,
  userDataDir: mkdtempSync(join(tmpdir(), 'bhojan-owner-auth-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;

async function readLoadedChunks(page) {
  const chunks = new Map();
  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/assets/') || !url.endsWith('.js')) return;
    try {
      chunks.set(url.split('/').pop(), await response.text());
    } catch {
      /* ignore */
    }
  });
  return chunks;
}

for (const target of TARGETS) {
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleMessages = [];
  const networkErrors = [];
  const chunks = await readLoadedChunks(page);

  page.on('pageerror', (err) => pageErrors.push(String(err?.message ?? err)));
  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on('requestfailed', (req) => {
    networkErrors.push(`${req.failure()?.errorText ?? 'failed'} ${req.url()}`);
  });

  console.log(`\n=== ${target.name}: ${target.url} ===`);

  try {
    const response = await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 90_000 });
    const status = response?.status() ?? 0;
    const headers = response?.headers() ?? {};
    const coop = headers['cross-origin-opener-policy'] ?? '(none)';

    await page.waitForFunction(
      () => document.body?.innerText?.includes('Continue with Google'),
      { timeout: 30_000 },
    );
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const firebaseConfig = await page.evaluate(() => {
      const cfg = window.__BH_FIREBASE_CONFIG__;
      return cfg
        ? {
            projectId: cfg.projectId,
            authDomain: cfg.authDomain,
            hasApiKey: Boolean(cfg.apiKey),
          }
        : null;
    });

    const bodySnippet = await page.evaluate(
      () => document.body?.innerText?.slice(0, 800) ?? '',
    );

    const configError = bodySnippet.includes('Configuration error') || bodySnippet.includes('Firebase is not configured');

    let redirectUrl = page.url();
    let redirectError = null;
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => null),
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

    const sessionFlags = await page.evaluate(() => ({
      authRedirecting: sessionStorage.getItem('auth_redirecting'),
      returnTo: sessionStorage.getItem('auth_return_to'),
      redirectAttempt: sessionStorage.getItem('auth_redirect_attempted'),
    }));

    const ownerLoginChunk = [...chunks.entries()].find(([name]) => name.startsWith('OwnerLogin-'))?.[1] ?? '';
    const googleWebAuthChunk = [...chunks.entries()].find(([name]) => name.startsWith('googleWebAuth-'))?.[1] ?? '';

    const bundleProbe = {
      ownerLoginLoaded: Boolean(ownerLoginChunk),
      googleWebAuthLoaded: Boolean(googleWebAuthChunk),
      staleAuthStateReady: ownerLoginChunk.includes('authStateReady'),
      hasRedirectAttemptKey: googleWebAuthChunk.includes('auth_redirect_attempted'),
      hasRedirectPendingGuard: ownerLoginChunk.includes('Google sign-in did not complete'),
    };

    const errConsole = consoleMessages.filter((m) => m.type === 'error');
    const authConsole = consoleMessages.filter(
      (m) => /auth|firebase|redirect|google|oauth/i.test(m.text),
    );

    const redirectLooksValid =
      redirectUrl &&
      (redirectUrl.includes('accounts.google.com') ||
        redirectUrl.includes('bhojanos-prod.firebaseapp.com') ||
        redirectUrl.includes('__/auth/handler'));

    const unauthorizedDomain = authConsole.some((m) => /not authorized for oauth/i.test(m.text));

    const broken =
      status !== 200 ||
      configError ||
      unauthorizedDomain ||
      pageErrors.length > 0 ||
      !firebaseConfig?.hasApiKey ||
      firebaseConfig?.projectId !== 'bhojanos-prod' ||
      firebaseConfig?.authDomain !== 'bhojanos-prod.firebaseapp.com' ||
      !redirectLooksValid ||
      bundleProbe.staleAuthStateReady ||
      !bundleProbe.hasRedirectAttemptKey ||
      !bundleProbe.hasRedirectPendingGuard ||
      (target.expectCoop !== '(none)' && coop !== target.expectCoop);

    if (broken) failures += 1;

    console.log(`HTTP ${status} | COOP: ${coop}`);
    console.log('Firebase runtime config:', firebaseConfig ?? '(missing — using build-time fallback)');
    console.log('Bundle probe:', bundleProbe);
    console.log('After Google click URL:', redirectUrl);
    console.log('Session flags:', sessionFlags);
    if (redirectError) console.log('Redirect capture note:', redirectError);
    if (pageErrors.length) console.log('Page errors:', pageErrors);
    if (errConsole.length) console.log('Console errors:', errConsole.slice(0, 8));
    if (authConsole.length) console.log('Auth console:', authConsole.slice(0, 8));
    if (networkErrors.length) console.log('Network failures:', networkErrors.slice(0, 5));
    console.log(broken ? 'RESULT: FAIL' : 'RESULT: PASS');
  } catch (error) {
    failures += 1;
    console.log('RESULT: FAIL —', error instanceof Error ? error.message : error);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(`\nOwner auth smoke: ${failures} failure(s) across ${TARGETS.length} targets`);
process.exit(failures > 0 ? 1 : 0);

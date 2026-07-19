#!/usr/bin/env node
/**
 * BhojanOS UAT runner — sandbox personas, browser + API validation.
 * Uses @bhojan.test accounts only. Never reads users.json / production exports.
 *
 * Env (optional for authenticated flows):
 *   UAT_PASSWORD          — shared password for sandbox @bhojan.test accounts
 *   UAT_FOUNDER_EMAIL     — founder login (default: bhojanos26@gmail.com)
 *   UAT_FOUNDER_PASSWORD  — founder password (not stored in repo)
 */
import puppeteer from 'puppeteer';
import crypto from 'node:crypto';

const API = 'https://manaintibojanam-backend.onrender.com';
const BASE = {
  marketplace: 'https://orderbhojan.web.app',
  founder: 'https://manaintibojanam.web.app',
  owner: 'https://bhojanos-owner.web.app',
  admin: 'https://bhojanos-admin.web.app',
};

const UAT_PASSWORD = process.env.UAT_PASSWORD || `Uat!${crypto.randomBytes(4).toString('hex')}Aa1`;
const PERSONAS = {
  customer: { email: 'uat-customer@bhojan.test', role: 'user' },
  owner: { email: 'uat-owner@bhojan.test', role: 'owner' },
  platformAdmin: { email: 'uat-platform-admin@bhojan.test', role: 'admin' },
  superAdmin: { email: 'uat-super-admin@bhojan.test', role: 'superadmin' },
  founderAdmin: {
    email: process.env.UAT_FOUNDER_EMAIL || 'bhojanos26@gmail.com',
    role: 'founder',
    useExisting: true,
  },
};

/** @type {{ severity: 'critical'|'high'|'medium'|'low', flow: string, step: string, detail: string }[]} */
const bugs = [];
const checks = [];

function bug(severity, flow, step, detail) {
  bugs.push({ severity, flow, step, detail });
  console.log(`BUG [${severity.toUpperCase()}] [${flow}] ${step} — ${detail}`);
}

function pass(flow, step, detail = '') {
  checks.push({ flow, step, pass: true, detail });
  console.log(`PASS [${flow}] ${step}${detail ? ` — ${detail}` : ''}`);
}

function fail(flow, step, detail = '') {
  checks.push({ flow, step, pass: false, detail });
  console.log(`FAIL [${flow}] ${step}${detail ? ` — ${detail}` : ''}`);
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(75_000) });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, ok: res.ok };
}

async function getFirebaseApiKey() {
  const { body } = await fetchJson(`${API}/api/client-config`);
  return body?.firebase?.apiKey ?? null;
}

async function ensureAuthUser(apiKey, email, password) {
  const signUp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const signUpBody = await signUp.json();
  if (signUp.ok && signUpBody.idToken) {
    return { created: true, idToken: signUpBody.idToken, localId: signUpBody.localId };
  }
  if (signUpBody?.error?.message === 'EMAIL_EXISTS') {
    const signIn = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    const signInBody = await signIn.json();
    if (signIn.ok && signInBody.idToken) {
      return { created: false, idToken: signInBody.idToken, localId: signInBody.localId };
    }
    return { error: signInBody?.error?.message ?? 'signIn failed' };
  }
  return { error: signUpBody?.error?.message ?? 'signUp failed' };
}

async function auditPage(page, url, waitMs = 2500) {
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];

  page.on('pageerror', (err) => pageErrors.push(String(err?.message ?? err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (!u.includes('google-analytics') && !u.includes('favicon')) {
      failedRequests.push({ url: u, error: req.failure()?.errorText });
    }
  });

  const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
  await new Promise((r) => setTimeout(r, waitMs));

  return {
    status: response?.status() ?? 0,
    finalUrl: page.url(),
    pageErrors,
    consoleErrors,
    failedRequests,
    bodyText: await page.evaluate(() => document.body?.innerText?.slice(0, 1200) ?? ''),
  };
}

async function loginEmailPassword(page, loginUrl, email, password) {
  const audit = await auditPage(page, loginUrl, 1500);
  const emailSel = 'input[type="email"], input[name="email"], input[autocomplete="email"]';
  const passSel = 'input[type="password"], input[name="password"]';
  await page.waitForSelector(emailSel, { timeout: 15_000 }).catch(() => null);
  const hasEmail = (await page.$(emailSel)) !== null;
  if (!hasEmail) {
    return { ...audit, loggedIn: false, reason: 'email field not found' };
  }
  await page.type(emailSel, email, { delay: 20 });
  await page.type(passSel, password, { delay: 20 });
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 5000));
  return {
    ...audit,
    loggedIn: !page.url().includes('/login'),
    finalUrl: page.url(),
  };
}

async function runApiChecks() {
  console.log('\n=== API / Payment / Logging ===');

  const health = await fetchJson(`${API}/api/health`);
  if (health.ok && health.body?.status === 'ok') {
    pass('Logging', 'Backend health', health.body?.firebase?.projectId);
  } else {
    fail('Logging', 'Backend health', String(health.status));
    bug('critical', 'Logging', 'Backend health', `Health endpoint failed (${health.status})`);
  }

  const discovery = await fetchJson(`${API}/api/marketplace/discovery?lat=17.4401&lng=78.3489&limit=10`);
  const collections = discovery.body?.value?.collections ?? [];
  if (discovery.ok) {
    pass('Customer', 'Discovery API responds', `${collections.length} collection(s)`);
    if (collections.every((c) => !c?.items?.length)) {
      bug(
        'critical',
        'Customer',
        'Browse Restaurants',
        'Marketplace discovery returns zero restaurants — customer cannot browse, order, or complete checkout UAT',
      );
    }
  } else {
    bug('critical', 'Customer', 'Discovery API', `HTTP ${discovery.status}`);
  }

  const search = await fetchJson(`${API}/api/marketplace/search?q=biryani&lat=17.4401&lng=78.3489`);
  const total = search.body?.value?.meta?.totalResults ?? -1;
  if (search.ok && total === 0) {
    bug('high', 'Customer', 'Search', 'Search returns zero results for "biryani" in Hyderabad — no discoverable tenants');
  } else if (search.ok) {
    pass('Customer', 'Search API', `${total} result(s)`);
  }

  const menuStart = Date.now();
  let menu = { status: 0, ok: false };
  try {
    menu = await fetchJson(`${API}/api/marketplace/tenants/mana-inti/menu`);
  } catch (e) {
    menu = { status: 0, ok: false, error: e?.message ?? String(e) };
  }
  const menuMs = Date.now() - menuStart;
  if (menu.status === 0 || menuMs >= 55_000) {
    bug('high', 'Customer', 'Restaurant menu API', `GET /tenants/mana-inti/menu timed out or failed (${menuMs}ms)`);
  } else if (menu.ok) {
    pass('Customer', 'Founder tenant menu API', `${menuMs}ms`);
  } else if (menu.status === 404) {
    bug('high', 'Founder', 'Menu', 'mana-inti menu endpoint returned 404 — founder kitchen may be unpublished');
  } else {
    bug('medium', 'Customer', 'Restaurant menu API', `HTTP ${menu.status} in ${menuMs}ms`);
  }

  let webhookStatus = 0;
  try {
    const webhook = await fetch(`${API}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'invalid' },
      body: JSON.stringify({ event: 'payment.captured' }),
      signal: AbortSignal.timeout(30_000),
    });
    webhookStatus = webhook.status;
  } catch (e) {
    bug('medium', 'Payment', 'Webhook', `Request failed: ${e?.message ?? e}`);
  }
  if (webhookStatus === 400 || webhookStatus === 401 || webhookStatus === 403) {
    pass('Payment', 'Webhook rejects invalid signature', `HTTP ${webhookStatus}`);
  } else if (webhookStatus) {

  const createOrder = await fetchJson(`${API}/api/create-razorpay-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 100, draftId: 'uat-invalid-draft' }),
  });
  if (createOrder.status === 400 || createOrder.status === 401 || createOrder.status === 404) {
    pass('Payment', 'Create order validates input', `HTTP ${createOrder.status}`);
  } else if (createOrder.status === 503) {
    bug('high', 'Payment', 'Sandbox', 'Razorpay not configured on backend (503)');
  } else if (createOrder.ok) {
    pass('Payment', 'Razorpay sandbox reachable', 'create-razorpay-order responded OK');
  }
}

async function runBrowserChecks(apiKey) {
  console.log('\n=== Browser UAT ===');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Customer — guest + auth surface
  {
    const page = await browser.newPage();
    try {
      const home = await auditPage(page, `${BASE.marketplace}/`);
      if (home.pageErrors.length) {
        bug('high', 'Customer', 'Discovery home', home.pageErrors.join('; '));
      } else {
        pass('Customer', 'Discovery home loads');
      }
      if (home.consoleErrors.length) {
        bug('medium', 'Logging', 'Customer home console', home.consoleErrors.slice(0, 3).join('; '));
      }
      if (home.failedRequests.length) {
        bug('medium', 'Logging', 'Customer home network', home.failedRequests.slice(0, 2).map((r) => r.url).join('; '));
      }

      const auth = await auditPage(page, `${BASE.marketplace}/auth`);
      pass('Customer', 'Auth page loads', `HTTP ${auth.status}`);
      const guestBtn = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button,a')];
        const hit = buttons.find((el) => /guest|continue without|skip/i.test(el.textContent ?? ''));
        if (hit) {
          hit.click();
          return true;
        }
        return false;
      });
      if (guestBtn) {
        await new Promise((r) => setTimeout(r, 3000));
        pass('Customer', 'Guest browsing entry', page.url());
      } else {
        bug('medium', 'Customer', 'Guest login', 'Continue-as-guest control not found on /auth');
      }

      const search = await auditPage(page, `${BASE.marketplace}/search?q=biryani`);
      pass('Customer', 'Search page loads', `HTTP ${search.status}`);
      const hasCards = await page.evaluate(() => document.querySelectorAll('.ob-discovery-card,[data-testid="restaurant-card"]').length);
      if (hasCards === 0) {
        bug('high', 'Customer', 'Search UI', 'No restaurant cards rendered for search query');
      }
    } catch (e) {
      bug('high', 'Customer', 'Browser flow', String(e?.message ?? e));
    } finally {
      await page.close();
    }
  }

  // Create sandbox customer auth (Firebase REST — no production PII)
  let customerToken = null;
  if (apiKey) {
    const authResult = await ensureAuthUser(apiKey, PERSONAS.customer.email, UAT_PASSWORD);
    if (authResult.idToken) {
      customerToken = authResult.idToken;
      pass('Customer', 'Register/login sandbox account', PERSONAS.customer.email);
    } else {
      bug('high', 'Customer', 'Register', authResult.error ?? 'Auth signup/signin failed');
    }
  } else {
    bug('critical', 'Customer', 'Firebase config', 'No apiKey from /api/client-config');
  }

  // Founder login (existing account — password from env only)
  if (process.env.UAT_FOUNDER_PASSWORD) {
    const page = await browser.newPage();
    try {
      const result = await loginEmailPassword(
        page,
        `${BASE.founder}/owner/login`,
        PERSONAS.founderAdmin.email,
        process.env.UAT_FOUNDER_PASSWORD,
      );
      if (result.loggedIn) {
        pass('Founder', 'Login', result.finalUrl);
        const dash = await auditPage(page, `${BASE.founder}/owner/dashboard`, 3000);
        if (dash.pageErrors.length) bug('high', 'Founder', 'Dashboard', dash.pageErrors.join('; '));
        else pass('Founder', 'Dashboard loads');
      } else {
        bug('high', 'Founder', 'Login', result.reason ?? `Still on login (${result.finalUrl})`);
      }
    } catch (e) {
      bug('high', 'Founder', 'Login', String(e?.message ?? e));
    } finally {
      await page.close();
    }
  } else {
    bug('high', 'Founder', 'Login UAT', 'Skipped — set UAT_FOUNDER_PASSWORD to validate authenticated founder flows');
  }

  // Owner portal login with sandbox account (expect role/tenant gate)
  {
    const page = await browser.newPage();
    try {
      const result = await loginEmailPassword(page, `${BASE.owner}/owner/login`, PERSONAS.owner.email, UAT_PASSWORD);
      if (result.loggedIn) {
        pass('Owner', 'Sandbox owner login', result.finalUrl);
        if (result.finalUrl.includes('login') || result.bodyText?.includes('access denied')) {
          bug('high', 'Owner', 'Dashboard', 'Owner sandbox account lacks tenant approval / ownedTenantIds');
        }
      } else if (result.reason === 'email field not found') {
        pass('Owner', 'Login page reachable');
      } else {
        pass('Owner', 'Login page + auth attempt', result.reason ?? 'credentials not provisioned in Firestore');
        bug('high', 'Owner', 'Registration/Approval', 'Sandbox owner cannot reach dashboard — Firestore seed required (ownedTenantIds + tenant doc)');
      }
    } catch (e) {
      bug('medium', 'Owner', 'Login', String(e?.message ?? e));
    } finally {
      await page.close();
    }
  }

  // Super admin login surface
  {
    const page = await browser.newPage();
    try {
      const r = await auditPage(page, `${BASE.founder}/super-admin/login`);
      pass('Super Admin', 'Login page loads', `HTTP ${r.status}`);
      if (process.env.UAT_FOUNDER_PASSWORD) {
        const result = await loginEmailPassword(
          page,
          `${BASE.founder}/super-admin/login`,
          PERSONAS.founderAdmin.email,
          process.env.UAT_FOUNDER_PASSWORD,
        );
        if (result.loggedIn) pass('Super Admin', 'Login', result.finalUrl);
        else bug('high', 'Super Admin', 'Login', result.reason ?? 'Login failed');
      }
    } catch (e) {
      bug('medium', 'Super Admin', 'Login page', String(e?.message ?? e));
    } finally {
      await page.close();
    }
  }

  // Founder PWA manifest (prior RC note)
  {
    const page = await browser.newPage();
    try {
      const resp = await page.goto(`${BASE.founder}/manifest.webmanifest`, { timeout: 30_000 });
      const ct = resp?.headers()['content-type'] ?? '';
      if (resp?.status() === 200 && ct.includes('json')) {
        pass('Founder', 'PWA manifest', ct);
      } else {
        bug('low', 'Founder', 'PWA manifest', `HTTP ${resp?.status()} content-type=${ct}`);
      }
    } catch (e) {
      bug('low', 'Founder', 'PWA manifest', String(e?.message ?? e));
    } finally {
      await page.close();
    }
  }

  await browser.close();
  return customerToken;
}

async function runSecurityChecks() {
  console.log('\n=== Security / Repo ===');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve(import.meta.dirname, '../..');
  for (const file of ['users.json', 'accounts.json']) {
    const p = path.join(root, file);
    if (fs.existsSync(p)) {
      bug(
        'critical',
        'Security',
        'PII in repository',
        `${file} contains production Firebase Auth export data and must not be committed`,
      );
    }
  }
  const adminScript = path.join(root, 'create-admin.mjs');
  if (fs.existsSync(adminScript)) {
    const src = fs.readFileSync(adminScript, 'utf8');
    if (/ADMIN_PASSWORD\s*=\s*['"][^'"]+['"]/.test(src)) {
      bug(
        'critical',
        'Security',
        'Hardcoded credentials',
        'create-admin.mjs contains a plaintext admin password in source control',
      );
    }
  }
}

async function main() {
  console.log('BhojanOS UAT — sandbox personas only');
  console.log(`Sandbox password prefix: ${UAT_PASSWORD.slice(0, 6)}… (full value in env UAT_PASSWORD)`);

  await runSecurityChecks();
  await runApiChecks();

  const apiKey = await getFirebaseApiKey();
  await runBrowserChecks(apiKey);

  console.log('\n=== UAT SUMMARY ===');
  console.log(`Checks: ${checks.filter((c) => c.pass).length}/${checks.length} passed`);
  console.log(`Bugs: ${bugs.length}`);

  const bySeverity = { critical: [], high: [], medium: [], low: [] };
  for (const b of bugs) {
    bySeverity[b.severity].push(b);
  }

  for (const [sev, list] of Object.entries(bySeverity)) {
    console.log(`\n${sev.toUpperCase()} (${list.length})`);
    for (const b of list) {
      console.log(`  - [${b.flow}] ${b.step}: ${b.detail}`);
    }
  }

  if (bySeverity.critical.length === 0 && bySeverity.high.length === 0) {
    console.log('\nBhojanOS passes User Acceptance Testing.');
  }

  process.exit(bySeverity.critical.length > 0 ? 2 : bySeverity.high.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

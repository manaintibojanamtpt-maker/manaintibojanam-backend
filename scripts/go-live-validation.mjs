#!/usr/bin/env node
/**
 * Go-live operational validation — unauthenticated + surface checks only.
 * Authenticated flows require test credentials (see output).
 */
import puppeteer from 'puppeteer';

const BASE = {
  founder: 'https://manaintibojanam.web.app',
  owner: 'https://bhojanos-owner.web.app',
  admin: 'https://bhojanos-admin.web.app',
  marketplace: 'https://orderbhojan.web.app',
};

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];

const results = [];

function record(flow, step, pass, detail = '') {
  results.push({ flow, step, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${flow}] ${step}${detail ? ` — ${detail}` : ''}`);
}

async function auditPage(page, url, opts = {}) {
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
  await new Promise((r) => setTimeout(r, opts.waitMs ?? 2500));

  const status = response?.status() ?? 0;
  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 800) ?? '');
  const broken =
    status !== 200 ||
    pageErrors.length > 0 ||
    bodyText.includes('Something went wrong') ||
    bodyText.includes('Maximum update depth') ||
    bodyText.includes('Unable to load');

  return { status, pageErrors, consoleErrors, failedRequests, broken, bodyText, finalUrl: page.url() };
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

// --- Customer / Marketplace (unauthenticated surface) ---
for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  try {
    const home = await auditPage(page, `${BASE.marketplace}/`);
    record('Customer', `Discovery home (${vp.name})`, !home.broken && home.status === 200, `HTTP ${home.status}`);
    record('Customer', `Console clean home (${vp.name})`, home.consoleErrors.length === 0, home.consoleErrors.slice(0, 2).join('; '));
  } catch (e) {
    record('Customer', `Discovery home (${vp.name})`, false, String(e?.message ?? e));
  }
  await page.close();
}

{
  const page = await browser.newPage();
  try {
    const search = await auditPage(page, `${BASE.marketplace}/search`);
    record('Customer', 'Restaurant search page loads', !search.broken && search.status === 200);
    const auth = await auditPage(page, `${BASE.marketplace}/auth`);
    record('Customer', 'Auth page loads', !auth.broken && auth.status === 200);
    const cart = await auditPage(page, `${BASE.marketplace}/cart`);
    record('Customer', 'Cart route loads', !cart.broken && cart.status === 200);
    const checkout = await auditPage(page, `${BASE.marketplace}/checkout`);
    record('Customer', 'Checkout route loads (unauth)', !checkout.broken && checkout.status === 200);
  } catch (e) {
    record('Customer', 'Marketplace routes', false, String(e?.message ?? e));
  }
  await page.close();
}

// --- Security: protected routes redirect ---
{
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE.founder}/owner/dashboard`, { waitUntil: 'networkidle2', timeout: 60_000 });
    await new Promise((r) => setTimeout(r, 2000));
    const url = page.url();
    record('Security', 'Owner dashboard blocks unauthenticated', url.includes('/owner/login') || url.includes('/login'), url);
  } catch (e) {
    record('Security', 'Owner dashboard blocks unauthenticated', false, String(e?.message ?? e));
  }
  await page.close();
}

{
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE.founder}/super-admin`, { waitUntil: 'networkidle2', timeout: 60_000 });
    await new Promise((r) => setTimeout(r, 2000));
    const url = page.url();
    record('Security', 'Super admin blocks unauthenticated', url.includes('/super-admin/login') || url.includes('/login'), url);
  } catch (e) {
    record('Security', 'Super admin blocks unauthenticated', false, String(e?.message ?? e));
  }
  await page.close();
}

// --- Founder / Owner / Admin login surfaces ---
for (const [flow, base, path] of [
  ['Founder', BASE.founder, '/owner/login'],
  ['Owner', BASE.owner, '/owner/login'],
  ['Founder', BASE.founder, '/admin/login'],
  ['Super Admin', BASE.founder, '/super-admin/login'],
]) {
  const page = await browser.newPage();
  try {
    const r = await auditPage(page, `${base}${path}`);
    record(flow, 'Login page loads', !r.broken && r.status === 200, `HTTP ${r.status}`);
    record(flow, 'Login console clean', r.consoleErrors.length === 0, r.consoleErrors.slice(0, 1).join('; '));
  } catch (e) {
    record(flow, 'Login page loads', false, String(e?.message ?? e));
  }
  await page.close();
}

// --- PWA ---
{
  const page = await browser.newPage();
  try {
    const manifestResp = await page.goto(`${BASE.marketplace}/manifest.webmanifest`, { timeout: 30_000 });
    const ct = manifestResp?.headers()['content-type'] ?? '';
    record('PWA', 'Marketplace manifest served', manifestResp?.status() === 200 && ct.includes('json'), ct);
    const swResp = await page.goto(`${BASE.marketplace}/sw.js`, { timeout: 30_000 });
    record('PWA', 'Service worker served', swResp?.status() === 200, `HTTP ${swResp?.status()}`);
  } catch (e) {
    record('PWA', 'Marketplace PWA assets', false, String(e?.message ?? e));
  }
  await page.close();
}

// --- Performance (marketplace home) ---
{
  const page = await browser.newPage();
  try {
    const client = await page.createCDPSession();
    await client.send('Performance.enable');
    const start = Date.now();
    await page.goto(`${BASE.marketplace}/`, { waitUntil: 'networkidle2', timeout: 90_000 });
    const loadMs = Date.now() - start;
    const metrics = await client.send('Performance.getMetrics');
    const lcpEntry = await page.evaluate(() => {
      const entries = performance.getEntriesByType('largest-contentful-paint');
      return entries.length ? entries[entries.length - 1].startTime : null;
    });
    record('Performance', 'Marketplace network-idle load', loadMs < 15000, `${loadMs}ms`);
    record('Performance', 'Marketplace LCP available', lcpEntry === null || lcpEntry < 4000, lcpEntry ? `${Math.round(lcpEntry)}ms` : 'n/a');
  } catch (e) {
    record('Performance', 'Marketplace metrics', false, String(e?.message ?? e));
  }
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} checks passed ===`);
if (failed.length) {
  console.log('\nFailed checks:');
  for (const f of failed) console.log(`  - [${f.flow}] ${f.step}: ${f.detail}`);
}
process.exit(failed.length ? 1 : 0);

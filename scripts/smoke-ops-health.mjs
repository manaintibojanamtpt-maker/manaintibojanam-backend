#!/usr/bin/env node
/**
 * Ops health smoke — verifies public /api/health and documents /api/ops/* endpoints.
 *
 * Usage:
 *   node scripts/smoke-ops-health.mjs
 *   API_URL=https://manaintibojanam-backend.onrender.com node scripts/smoke-ops-health.mjs
 *
 * Ops routes require superadmin auth (Firebase ID token). This script validates
 * public health only; ops endpoints are documented for manual / authenticated checks.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const API_URL = (process.env.API_URL || 'https://manaintibojanam-backend.onrender.com').replace(
  /\/$/,
  '',
);

/** Public storefronts probed in addition to API /api/health. */
const STATIC_URLS = [
  { label: 'OrderBhojan', url: 'https://orderbhojan.web.app' },
  { label: 'BhojanOS', url: 'https://www.bhojanos.com' },
];

const OPS_ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/ops/incidents',
    auth: 'superadmin',
    query: '?since=ISO&type=system_errors&status=DETECTED&tenantId=...&limit=50',
    description: 'Unified incident list from system_incidents (founder dashboard)',
  },
  {
    method: 'GET',
    path: '/api/ops/incidents/stats',
    auth: 'superadmin',
    query: '?since=ISO (default: last 1 hour)',
    description: 'Hourly-style counts by incident type — same source AutoPilot uses',
  },
  {
    method: 'GET',
    path: '/api/ops/health-summary',
    auth: 'superadmin',
    query: '',
    description: 'Aggregated ops payload: API health, open incidents, deploy, trend',
  },
];

function printOpsCatalog() {
  console.log('\n--- /api/ops/* endpoints (superadmin required) ---\n');
  for (const endpoint of OPS_ENDPOINTS) {
    console.log(`${endpoint.method} ${endpoint.path}${endpoint.query}`);
    console.log(`  Auth: ${endpoint.auth}`);
    console.log(`  ${endpoint.description}\n`);
  }
  console.log('Authenticated check example:');
  console.log(
    `  curl -H "Authorization: Bearer <firebase-id-token>" "${API_URL}/api/ops/health-summary"`,
  );
}

async function fetchJson(path, timeoutMs = 15_000) {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const body = await response.json().catch(() => ({}));
  return { url, status: response.status, body };
}

async function fetchStatic(url, timeoutMs = 15_000) {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });
  const snippet = (await response.text().catch(() => '')).slice(0, 200);
  return { url, status: response.status, snippet };
}

async function main() {
  console.log('=== BhojanOS Ops Health Smoke ===');
  console.log(`API_URL: ${API_URL}\n`);

  let failed = false;

  try {
    const health = await fetchJson('/api/health');
    console.log(`GET /api/health → ${health.status}`);
    if (health.status !== 200) {
      console.error('  FAIL: expected 200');
      failed = true;
    } else {
      const { status, firestore, platform } = health.body;
      console.log(`  status: ${status ?? 'unknown'}`);
      console.log(`  firestore.projectId: ${firestore?.projectId ?? 'n/a'}`);
      console.log(`  firestore.backedOff: ${firestore?.backedOff ?? 'n/a'}`);
      console.log(`  platform.build: ${platform?.build ?? 'n/a'}`);
      console.log(`  platform.tier: ${platform?.tier ?? 'n/a'}`);
      if (status !== 'ok') {
        console.error('  FAIL: health status is not ok');
        failed = true;
      }
    }
  } catch (err) {
    console.error(`  FAIL: /api/health unreachable — ${err instanceof Error ? err.message : err}`);
    failed = true;
  }

  console.log('\n--- Static storefront URLs ---\n');
  for (const target of STATIC_URLS) {
    try {
      const probe = await fetchStatic(target.url);
      console.log(`${target.label} ${target.url} → ${probe.status}`);
      if (probe.status < 200 || probe.status >= 400) {
        console.error(`  FAIL: expected 2xx/3xx`);
        failed = true;
      }
    } catch (err) {
      console.error(
        `  FAIL: ${target.label} unreachable — ${err instanceof Error ? err.message : err}`,
      );
      failed = true;
    }
  }

  printOpsCatalog();

  // Probe ops routes without auth — expect 401/403, not 404 (wiring check).
  // Timeouts are warn-only: routes may be slow on cold start or not yet deployed.
  console.log('\n--- Ops route wiring probe (no auth, optional) ---\n');
  for (const endpoint of OPS_ENDPOINTS) {
    try {
      const probe = await fetchJson(endpoint.path, 5_000);
      const wired = probe.status === 401 || probe.status === 403 || probe.status === 503;
      const label = wired ? 'OK (auth required)' : `status ${probe.status}`;
      console.log(`${endpoint.method} ${endpoint.path} → ${probe.status} ${label}`);
      if (probe.status === 404) {
        console.warn('  WARN: route not found — deploy API with registerOpsRoutes');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`${endpoint.method} ${endpoint.path} → WARN ${message} (ops probe skipped)`);
    }
  }

  const report = {
    checkedAt: new Date().toISOString(),
    apiUrl: API_URL,
    healthPath: '/api/health',
    staticUrls: STATIC_URLS.map((entry) => entry.url),
    opsEndpoints: OPS_ENDPOINTS,
    passed: !failed,
  };

  const reportPath = resolve(root, 'scripts/.smoke-ops-health-report.json');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nReport written: ${reportPath}`);

  if (failed) {
    console.error('\nOps health smoke FAILED');
    process.exit(1);
  }

  console.log('\nOps health smoke PASSED');
}

main();

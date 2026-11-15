#!/usr/bin/env node
/**
 * Ops health smoke — verifies public /api/health with cold-start resilience
 * and documents/probes /api/ops/* endpoints.
 *
 * Usage:
 *   node scripts/smoke-ops-health.mjs
 *   API_URL=https://manaintibojanam-backend.onrender.com node scripts/smoke-ops-health.mjs
 *
 * Designed for Render Free Tier cold-start tolerance:
 *   - Up to 90s per request timeout on /api/health
 *   - Maximum 3 attempts with bounded exponential backoff
 *   - Distinguishes PASS, RETRY, WARN, SKIPPED, and FAIL
 *   - Ops health-summary executes only after primary health check passes
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

export const DEFAULT_API_URL = 'https://manaintibojanam-backend.onrender.com';
export const DEFAULT_HEALTH_TIMEOUT_MS = 90_000;
export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_INITIAL_BACKOFF_MS = 2_000;
export const DEFAULT_BACKOFF_MULTIPLIER = 2;
export const DEFAULT_MAX_BACKOFF_MS = 8_000;

/**
 * Transient HTTP status codes eligible for retry on /api/health:
 * 429: Too Many Requests (rate limited)
 * 502: Bad Gateway
 * 503: Service Unavailable (cold start warming / container starting)
 * 504: Gateway Timeout
 */
export const RETRYABLE_STATUS_CODES = [429, 502, 503, 504];

export function isRetryableStatusCode(status) {
  return typeof status === 'number' && RETRYABLE_STATUS_CODES.includes(status);
}

/** Public storefronts probed in addition to API /api/health. */
export const STATIC_URLS = [
  { label: 'OrderBhojan', url: 'https://orderbhojan.web.app' },
  { label: 'BhojanOS', url: 'https://www.bhojanos.com' },
];

export const OPS_ENDPOINTS = [
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

export function printOpsCatalog(apiUrl = DEFAULT_API_URL, logger = console) {
  logger.log('\n--- /api/ops/* endpoints (superadmin required) ---\n');
  for (const endpoint of OPS_ENDPOINTS) {
    logger.log(`${endpoint.method} ${endpoint.path}${endpoint.query}`);
    logger.log(`  Auth: ${endpoint.auth}`);
    logger.log(`  ${endpoint.description}\n`);
  }
  logger.log('Authenticated check example:');
  logger.log(
    `  curl -H "Authorization: Bearer <firebase-id-token>" "${apiUrl}/api/ops/health-summary"`,
  );
}

/**
 * Validates /api/health with bounded retry logic and exponential backoff
 * tailored for container cold starts on Render Free Tier.
 */
export async function checkPrimaryHealth({
  apiUrl = DEFAULT_API_URL,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS,
  initialBackoffMs = DEFAULT_INITIAL_BACKOFF_MS,
  backoffMultiplier = DEFAULT_BACKOFF_MULTIPLIER,
  maxBackoffMs = DEFAULT_MAX_BACKOFF_MS,
  fetchFn = fetch,
  sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  logger = console,
} = {}) {
  const cleanApiUrl = apiUrl.replace(/\/$/, '');
  const url = `${cleanApiUrl}/api/health`;
  const attempts = [];
  let passed = false;
  let finalHealthBody = null;
  let finalStatus = null;
  let backoff = initialBackoffMs;
  const overallStart = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptStart = Date.now();
    let attemptStatus = null;
    let attemptError = null;
    let isRetryable = false;
    let body = null;

    try {
      const response = await fetchFn(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json' },
      });

      attemptStatus = response.status;
      const rawText = await response.text();
      try {
        body = JSON.parse(rawText);
      } catch (parseErr) {
        attemptError = new Error(`Malformed JSON response: ${parseErr.message}`);
        // If HTTP status is transient (429, 502, 503, 504), consider retryable
        isRetryable = isRetryableStatusCode(attemptStatus);
      }

      if (!attemptError) {
        if (attemptStatus === 200) {
          if (body?.status === 'ok') {
            passed = true;
            finalHealthBody = body;
            finalStatus = 200;
            const elapsedMs = Date.now() - attemptStart;
            attempts.push({
              attempt,
              elapsedMs,
              status: 200,
              pass: true,
              body,
            });
            logger.log(
              `[PASS] GET /api/health → 200 OK (${elapsedMs}ms, attempt ${attempt}/${maxAttempts})`,
            );
            if (body.platform) {
              logger.log(`  status: ${body.status}`);
              logger.log(`  platform.tier: ${body.platform.tier ?? 'n/a'}`);
              logger.log(`  platform.build: ${body.platform.build ?? 'n/a'}`);
              logger.log(`  firestore.projectId: ${body.firestore?.projectId ?? 'n/a'}`);
            }
            break;
          } else {
            attemptError = new Error(
              `Health payload status is '${body?.status ?? 'unknown'}' (expected 'ok')`,
            );
            // Server responded 200 but explicitly reports unhealthy/degraded
            isRetryable = false;
          }
        } else if (isRetryableStatusCode(attemptStatus)) {
          attemptError = new Error(`Transient HTTP ${attemptStatus}`);
          isRetryable = true;
        } else {
          // Permanent client or unhandled status (400, 401, 403, 404, etc.)
          attemptError = new Error(`Non-retryable HTTP ${attemptStatus}`);
          isRetryable = false;
        }
      }
    } catch (err) {
      const isTimeout =
        err?.name === 'TimeoutError' ||
        err?.name === 'AbortError' ||
        /timeout|aborted/i.test(err?.message ?? '');
      attemptError = isTimeout ? new Error(`Timed out after ${timeoutMs}ms`) : err;
      isRetryable = true;
    }

    const elapsedMs = Date.now() - attemptStart;
    finalStatus = attemptStatus;
    attempts.push({
      attempt,
      elapsedMs,
      status: attemptStatus,
      error: attemptError?.message,
      isRetryable,
      pass: false,
    });

    if (passed) break;

    if (attempt < maxAttempts && isRetryable) {
      const sleepMs = Math.min(backoff, maxBackoffMs);
      logger.log(
        `[RETRY] Attempt ${attempt}/${maxAttempts} failed after ${elapsedMs}ms (${attemptError?.message}) — retrying in ${sleepMs}ms...`,
      );
      await sleepFn(sleepMs);
      backoff = Math.min(backoff * backoffMultiplier, maxBackoffMs);
    } else {
      logger.error(
        `[FAIL] Attempt ${attempt}/${maxAttempts} failed after ${elapsedMs}ms (${attemptError?.message}) — not retrying`,
      );
      break;
    }
  }

  const totalElapsedMs = Date.now() - overallStart;

  return {
    pass: passed,
    attempts,
    totalElapsedMs,
    finalStatus,
    body: finalHealthBody,
    coldStartDetected: attempts.length > 1,
  };
}

/**
 * Probes static storefront URLs.
 */
export async function probeStaticUrls({
  urls = STATIC_URLS,
  timeoutMs = 15_000,
  fetchFn = fetch,
  logger = console,
} = {}) {
  logger.log('\n--- Static storefront URLs ---\n');
  const results = [];
  let allPassed = true;

  for (const target of urls) {
    const start = Date.now();
    try {
      const response = await fetchFn(target.url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'text/html,application/xhtml+xml' },
      });
      const elapsedMs = Date.now() - start;
      const ok = response.status >= 200 && response.status < 400;
      results.push({
        label: target.label,
        url: target.url,
        status: response.status,
        elapsedMs,
        pass: ok,
      });
      if (ok) {
        logger.log(`[PASS] ${target.label} ${target.url} → ${response.status} (${elapsedMs}ms)`);
      } else {
        logger.error(`[FAIL] ${target.label} ${target.url} → HTTP ${response.status}`);
        allPassed = false;
      }
    } catch (err) {
      const elapsedMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        label: target.label,
        url: target.url,
        status: null,
        error: msg,
        elapsedMs,
        pass: false,
      });
      logger.error(`[FAIL] ${target.label} unreachable — ${msg}`);
      allPassed = false;
    }
  }

  return { pass: allPassed, results };
}

/**
 * Probes ops endpoints.
 * If primary health check failed, skips ops probes.
 * Supports authenticated validation if token is provided.
 * If unauthenticated, validates wiring (expects 401/403/503), marking warnings if optional.
 */
export async function probeOpsEndpoints({
  apiUrl = DEFAULT_API_URL,
  endpoints = OPS_ENDPOINTS,
  timeoutMs = 10_000,
  authToken = process.env.OPS_BEARER_TOKEN || process.env.OPS_AUTH_TOKEN || null,
  opsMandatory = process.env.OPS_MANDATORY === 'true',
  primaryPassed = true,
  fetchFn = fetch,
  logger = console,
} = {}) {
  const cleanApiUrl = apiUrl.replace(/\/$/, '');

  if (!primaryPassed) {
    logger.log('\n--- Ops route probe: SKIPPED (primary health check failed) ---');
    return {
      pass: !opsMandatory,
      skipped: true,
      results: endpoints.map((ep) => ({
        path: ep.path,
        status: 'SKIPPED',
        reason: 'primary_health_failed',
      })),
    };
  }

  logger.log(
    `\n--- Ops route probe (${authToken ? 'authenticated' : 'no auth, wiring check'}${opsMandatory ? ', mandatory' : ', optional'}) ---\n`,
  );

  const results = [];
  let allPassed = true;

  for (const endpoint of endpoints) {
    const start = Date.now();
    const headers = { Accept: 'application/json' };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    try {
      const url = `${cleanApiUrl}${endpoint.path}`;
      const response = await fetchFn(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers,
      });

      const elapsedMs = Date.now() - start;
      const status = response.status;

      if (authToken) {
        // Authenticated check
        if (status === 200) {
          logger.log(`[PASS] ${endpoint.method} ${endpoint.path} → 200 OK (${elapsedMs}ms)`);
          results.push({ path: endpoint.path, status, pass: true, elapsedMs });
        } else {
          const failMsg = `HTTP ${status}`;
          if (opsMandatory) {
            logger.error(`[FAIL] ${endpoint.method} ${endpoint.path} → ${failMsg}`);
            results.push({ path: endpoint.path, status, pass: false, error: failMsg, elapsedMs });
            allPassed = false;
          } else {
            logger.warn(`[WARN] ${endpoint.method} ${endpoint.path} → ${failMsg} (ops probe optional)`);
            results.push({ path: endpoint.path, status, pass: true, warn: failMsg, elapsedMs });
          }
        }
      } else {
        // Unauthenticated wiring probe
        if (status === 401 || status === 403) {
          // Authentic proof of authentication enforcement
          logger.log(
            `[PASS] ${endpoint.method} ${endpoint.path} → ${status} OK (auth required) (${elapsedMs}ms)`,
          );
          results.push({ path: endpoint.path, status, pass: true, elapsedMs });
        } else if (status === 503) {
          // HTTP 503 Service Unavailable: Never classify as proof of auth enforcement
          const msg =
            'HTTP 503 Service Unavailable (service in maintenance/unavailable; not proof of auth enforcement)';
          if (opsMandatory) {
            logger.error(`[FAIL] ${endpoint.method} ${endpoint.path} → 503 (${msg})`);
            results.push({ path: endpoint.path, status, pass: false, error: msg, elapsedMs });
            allPassed = false;
          } else {
            logger.warn(`[WARN] ${endpoint.method} ${endpoint.path} → 503 (${msg}) (ops probe optional)`);
            results.push({ path: endpoint.path, status, pass: true, warn: msg, elapsedMs });
          }
        } else if (status === 404) {
          // Route missing
          const warnMsg = 'Route not found (HTTP 404) — deploy API with registerOpsRoutes';
          if (opsMandatory) {
            logger.error(`[FAIL] ${endpoint.method} ${endpoint.path} → 404 (${warnMsg})`);
            results.push({ path: endpoint.path, status, pass: false, error: warnMsg, elapsedMs });
            allPassed = false;
          } else {
            logger.warn(`[WARN] ${endpoint.method} ${endpoint.path} → 404 (${warnMsg})`);
            results.push({ path: endpoint.path, status, pass: true, warn: warnMsg, elapsedMs });
          }
        } else if (status === 200) {
          // Ops endpoints require superadmin auth; 200 without auth indicates lack of auth enforcement
          const authLeakMsg = 'Unexpected HTTP 200 without authentication (expected 401/403)';
          if (opsMandatory) {
            logger.error(`[FAIL] ${endpoint.method} ${endpoint.path} → 200 (${authLeakMsg})`);
            results.push({ path: endpoint.path, status, pass: false, error: authLeakMsg, elapsedMs });
            allPassed = false;
          } else {
            logger.warn(`[WARN] ${endpoint.method} ${endpoint.path} → 200 (${authLeakMsg})`);
            results.push({ path: endpoint.path, status, pass: true, warn: authLeakMsg, elapsedMs });
          }
        } else {
          // Other unexpected status (500, 502, etc.)
          const unexpMsg = `Unexpected HTTP ${status}`;
          if (opsMandatory) {
            logger.error(`[FAIL] ${endpoint.method} ${endpoint.path} → ${unexpMsg}`);
            results.push({ path: endpoint.path, status, pass: false, error: unexpMsg, elapsedMs });
            allPassed = false;
          } else {
            logger.warn(`[WARN] ${endpoint.method} ${endpoint.path} → ${unexpMsg} (ops probe optional)`);
            results.push({ path: endpoint.path, status, pass: true, warn: unexpMsg, elapsedMs });
          }
        }
      }
    } catch (err) {
      const elapsedMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      if (opsMandatory) {
        logger.error(`[FAIL] ${endpoint.method} ${endpoint.path} → ${msg}`);
        results.push({ path: endpoint.path, status: null, pass: false, error: msg, elapsedMs });
        allPassed = false;
      } else {
        logger.warn(`[WARN] ${endpoint.method} ${endpoint.path} → ${msg} (ops probe skipped)`);
        results.push({ path: endpoint.path, status: null, pass: true, warn: msg, elapsedMs });
      }
    }
  }

  return { pass: allPassed, results };
}

/**
 * Main coordinator function.
 */
export async function runSmokeHealth({
  apiUrl = process.env.API_URL || DEFAULT_API_URL,
  maxAttempts = process.env.HEALTH_MAX_ATTEMPTS
    ? parseInt(process.env.HEALTH_MAX_ATTEMPTS, 10)
    : DEFAULT_MAX_ATTEMPTS,
  timeoutMs = process.env.HEALTH_TIMEOUT_MS
    ? parseInt(process.env.HEALTH_TIMEOUT_MS, 10)
    : DEFAULT_HEALTH_TIMEOUT_MS,
  initialBackoffMs = process.env.HEALTH_INITIAL_BACKOFF_MS
    ? parseInt(process.env.HEALTH_INITIAL_BACKOFF_MS, 10)
    : DEFAULT_INITIAL_BACKOFF_MS,
  maxBackoffMs = process.env.HEALTH_MAX_BACKOFF_MS
    ? parseInt(process.env.HEALTH_MAX_BACKOFF_MS, 10)
    : DEFAULT_MAX_BACKOFF_MS,
  authToken = process.env.OPS_BEARER_TOKEN || process.env.OPS_AUTH_TOKEN || null,
  opsMandatory = process.env.OPS_MANDATORY === 'true',
  reportOutputPath = resolve(root, 'scripts/.smoke-ops-health-report.json'),
  fetchFn = fetch,
  sleepFn,
  logger = console,
} = {}) {
  logger.log('=== BhojanOS Ops Health Smoke (Cold-Start Resilient) ===');
  logger.log(`API_URL: ${apiUrl}`);
  logger.log(`Max attempts: ${maxAttempts}, Per-attempt timeout: ${timeoutMs}ms\n`);

  // 1. Primary Health Endpoint
  const healthResult = await checkPrimaryHealth({
    apiUrl,
    maxAttempts,
    timeoutMs,
    initialBackoffMs,
    maxBackoffMs,
    fetchFn,
    sleepFn,
    logger,
  });

  // 2. Static Storefront URLs
  const staticResult = await probeStaticUrls({
    urls: STATIC_URLS,
    fetchFn,
    logger,
  });

  // 3. Ops Catalog Documentation
  printOpsCatalog(apiUrl, logger);

  // 4. Ops Route Probe
  const opsResult = await probeOpsEndpoints({
    apiUrl,
    authToken,
    opsMandatory,
    primaryPassed: healthResult.pass,
    fetchFn,
    logger,
  });

  const overallPassed = healthResult.pass && staticResult.pass && opsResult.pass;

  const report = {
    checkedAt: new Date().toISOString(),
    apiUrl,
    healthPath: '/api/health',
    primaryHealth: healthResult,
    staticUrls: staticResult.results,
    opsEndpoints: opsResult.results,
    passed: overallPassed,
  };

  try {
    writeFileSync(reportOutputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    logger.log(`\nReport written: ${reportOutputPath}`);
  } catch (writeErr) {
    logger.warn(`Could not write report to ${reportOutputPath}: ${writeErr.message}`);
  }

  if (overallPassed) {
    logger.log('\nOps health smoke PASSED');
  } else {
    logger.error('\nOps health smoke FAILED');
  }

  return report;
}

// Direct CLI entry point
const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMainModule) {
  runSmokeHealth()
    .then((report) => {
      process.exit(report.passed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal smoke error:', err);
      process.exit(1);
    });
}

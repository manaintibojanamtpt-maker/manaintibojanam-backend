#!/usr/bin/env node
/**
 * Mandatory pre-production release gate.
 * Cold-start aware: configurable timeout (RELEASE_GATE_TIMEOUT_MS) accommodates
 * Render Free Tier cold starts while strictly enforcing bounded request behavior.
 *
 * Usage:
 *   RELEASE_API_BASE=https://manaintibojanam-backend.onrender.com node scripts/release-gate.mjs
 *   RELEASE_GATE_TIMEOUT_MS=60000 node scripts/release-gate.mjs
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const DEFAULT_API_BASE = 'https://manaintibojanam-backend.onrender.com';
export const DEFAULT_RELEASE_GATE_TIMEOUT_MS = 60_000; // 60s comfortably accommodates cold starts (31.6s) with buffer

export const TEST_COORDS = [
  { label: 'Pune-mana-inti', lat: 18.49959440695956, lng: 73.97858993491619 },
  { label: 'Hyderabad-default', lat: 17.4401, lng: 78.3489 },
];

export async function fetchJson(
  path,
  apiBase = DEFAULT_API_BASE,
  timeoutMs = DEFAULT_RELEASE_GATE_TIMEOUT_MS,
  fetchFn = fetch,
) {
  const cleanBase = apiBase.replace(/\/$/, '');
  try {
    const response = await fetchFn(`${cleanBase}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/json' },
    });
    let body;
    try {
      body = await response.json();
    } catch {
      body = {};
    }
    return { status: response.status, body };
  } catch (err) {
    const isTimeout =
      err?.name === 'TimeoutError' ||
      err?.name === 'AbortError' ||
      /timeout|aborted/i.test(err?.message ?? '');
    return {
      status: isTimeout ? 504 : 0,
      error: isTimeout
        ? `Request timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err),
      body: {},
    };
  }
}

export function uniqueSlugsFromDiscovery(body) {
  const collections = body?.value?.collections ?? body?.collections ?? [];
  const slugs = new Set();
  for (const collection of collections) {
    for (const restaurant of collection.restaurants ?? []) {
      if (restaurant.slug) slugs.add(restaurant.slug);
      if (restaurant.restaurantSlug) slugs.add(restaurant.restaurantSlug);
    }
  }
  return [...slugs];
}

export async function runReleaseGate({
  apiBase = process.env.RELEASE_API_BASE ?? DEFAULT_API_BASE,
  timeoutMs = process.env.RELEASE_GATE_TIMEOUT_MS
    ? parseInt(process.env.RELEASE_GATE_TIMEOUT_MS, 10)
    : DEFAULT_RELEASE_GATE_TIMEOUT_MS,
  coords = TEST_COORDS,
  fetchFn = fetch,
  logger = console,
} = {}) {
  const cleanApiBase = apiBase.replace(/\/$/, '');
  const failures = [];

  // 1. Health check
  const health = await fetchJson('/api/health', cleanApiBase, timeoutMs, fetchFn);
  const build = health.body?.platform?.build ?? health.body?.build ?? 'unknown';

  if (health.error) {
    failures.push(`health error: ${health.error}`);
  } else if (health.status !== 200 || health.body?.status !== 'ok') {
    failures.push(`health HTTP ${health.status}`);
  }

  // 2. Discovery across test coordinates
  let totalUnique = 0;
  let anyNonZero = false;
  const perCoord = [];

  for (const coord of coords) {
    const discovery = await fetchJson(
      `/api/marketplace/discovery?lat=${coord.lat}&lng=${coord.lng}&limit=24&maxDistanceKm=18`,
      cleanApiBase,
      timeoutMs,
      fetchFn,
    );

    if (discovery.error) {
      failures.push(`discovery ${coord.label} error: ${discovery.error}`);
    } else if (discovery.status !== 200) {
      failures.push(`discovery ${coord.label} HTTP ${discovery.status}`);
    }

    const slugs = uniqueSlugsFromDiscovery(discovery.body);
    const uat = slugs.some((s) => s.includes('uat') || s.includes('sandbox'));
    perCoord.push({ ...coord, count: slugs.length, slugs, uat });
    totalUnique += slugs.length;
    if (slugs.length > 0) anyNonZero = true;
    if (uat) failures.push(`discovery ${coord.label} includes UAT/sandbox tenant`);
  }

  if (!anyNonZero && failures.length === 0) {
    failures.push('discovery returned zero restaurants at all test coordinates');
  }

  // 3. Search query
  const search = await fetchJson(
    `/api/marketplace/search?q=biryani&lat=18.49959440695956&lng=73.97858993491619&limit=24`,
    cleanApiBase,
    timeoutMs,
    fetchFn,
  );

  const searchTotal =
    search.body?.value?.meta?.totalResults ?? search.body?.meta?.totalResults ?? 0;

  if (search.error) {
    failures.push(`search error: ${search.error}`);
  } else if (search.status !== 200) {
    failures.push(`search HTTP ${search.status}`);
  }

  if (searchTotal === 0 && !search.error && search.status === 200) {
    failures.push('search returned zero results at Pune test coords');
  }

  const pass = failures.length === 0;

  const result = {
    pass,
    build,
    apiBase: cleanApiBase,
    timeoutMs,
    discovery: perCoord,
    searchTotal,
    failures,
  };

  logger.log(JSON.stringify(result, null, 2));
  return result;
}

// Direct CLI entry point
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  runReleaseGate()
    .then((result) => {
      process.exit(result.pass ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

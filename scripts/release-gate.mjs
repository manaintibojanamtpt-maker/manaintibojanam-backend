#!/usr/bin/env node
/**
 * Mandatory pre-production release gate.
 * Usage: RELEASE_API_BASE=https://manaintibojanam-backend.onrender.com node scripts/release-gate.mjs
 */
const API_BASE = (process.env.RELEASE_API_BASE ?? 'https://manaintibojanam-backend.onrender.com').replace(/\/$/, '');
const TEST_COORDS = [
  { label: 'Pune-mana-inti', lat: 18.49959440695956, lng: 73.97858993491619 },
  { label: 'Hyderabad-default', lat: 17.4401, lng: 78.3489 },
];

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const body = await response.json();
  return { status: response.status, body };
}

function uniqueSlugsFromDiscovery(body) {
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

async function main() {
  const failures = [];

  const health = await fetchJson('/api/health');
  const build = health.body?.platform?.build ?? health.body?.build ?? 'unknown';
  if (health.status !== 200 || health.body?.status !== 'ok') {
    failures.push(`health HTTP ${health.status}`);
  }

  let totalUnique = 0;
  let anyNonZero = false;
  const perCoord = [];
  for (const coord of TEST_COORDS) {
    const discovery = await fetchJson(
      `/api/marketplace/discovery?lat=${coord.lat}&lng=${coord.lng}&limit=24&maxDistanceKm=18`,
    );
    const slugs = uniqueSlugsFromDiscovery(discovery.body);
    const uat = slugs.some((s) => s.includes('uat') || s.includes('sandbox'));
    perCoord.push({ ...coord, count: slugs.length, slugs, uat });
    totalUnique += slugs.length;
    if (slugs.length > 0) anyNonZero = true;
    if (discovery.status !== 200) failures.push(`discovery ${coord.label} HTTP ${discovery.status}`);
    if (uat) failures.push(`discovery ${coord.label} includes UAT/sandbox tenant`);
  }
  if (!anyNonZero) failures.push('discovery returned zero restaurants at all test coordinates');

  const search = await fetchJson(
    `/api/marketplace/search?q=biryani&lat=18.49959440695956&lng=73.97858993491619&limit=24`,
  );
  const searchTotal = search.body?.value?.meta?.totalResults ?? search.body?.meta?.totalResults ?? 0;
  if (search.status !== 200) failures.push(`search HTTP ${search.status}`);
  if (searchTotal === 0) failures.push('search returned zero results at Pune test coords');

  const pass = failures.length === 0;
  console.log(
    JSON.stringify(
      {
        pass,
        build,
        apiBase: API_BASE,
        discovery: perCoord,
        searchTotal,
        failures,
      },
      null,
      2,
    ),
  );
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

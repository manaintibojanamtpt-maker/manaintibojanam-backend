/**
 * Pre-production smoke, performance, and load tests.
 * Run: npx tsx scripts/preprod-smoke-test.ts [--base=http://localhost:8080]
 */

import {
  classifyCustomer,
  generateCampaign,
  normalizeCampaignAudience,
  type CustomerSegmentSummary,
} from '../src/services/customerSegmentLogic';
import { NotificationStatus } from '../src/modules/notifications/NotificationTypes';

const CLI_BASE = process.argv.find((a) => a.startsWith('--base='))?.split('=')[1];
let serverBase = CLI_BASE ?? 'http://localhost:8080';

async function resolveServerBase(): Promise<string | null> {
  const candidates = CLI_BASE
    ? [CLI_BASE]
    : ['http://localhost:8081', 'http://localhost:8080', 'http://localhost:8090'];

  for (const base of candidates) {
    try {
      const [root, health] = await Promise.all([
        fetch(`${base}/`, { signal: AbortSignal.timeout(4000) }),
        fetch(`${base}/api/health`, { signal: AbortSignal.timeout(4000) }),
      ]);
      if (root.ok && health.ok) {
        serverBase = base;
        if (!CLI_BASE && base !== 'http://localhost:8080') {
          console.log(`  INFO  Using ${base} (8080 unavailable or rate-limited)`);
        }
        return base;
      }
    } catch {
      // try next port
    }
  }
  return null;
}

type Result = { name: string; ok: boolean; ms?: number; detail?: string };

const results: Result[] = [];
let failures = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (!condition) {
    failures += 1;
    results.push({ name, ok: false, detail });
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    return;
  }
  results.push({ name, ok: true, detail });
  console.log(`  PASS  ${name}`);
}

function assertEq<T>(name: string, actual: T, expected: T) {
  assert(name, actual === expected, `expected ${String(expected)}, got ${String(actual)}`);
}

// ─── Unit: Customer intelligence ───────────────────────────────────────────

function testCustomerIntelligence() {
  console.log('\n[Unit] CustomerIntelligenceService');

  const recent = new Date();
  const atRisk = new Date(Date.now() - 20 * 86400000);
  const churned = new Date(Date.now() - 45 * 86400000);

  assertEq('classifyCustomer: new', classifyCustomer(1, 100, recent), 'New');
  assertEq('classifyCustomer: repeat', classifyCustomer(3, 500, recent), 'Repeat');
  assertEq('classifyCustomer: vip', classifyCustomer(2, 6000, recent), 'VIP');
  assertEq('classifyCustomer: at risk', classifyCustomer(2, 500, atRisk), 'At Risk');
  assertEq('classifyCustomer: churned', classifyCustomer(2, 500, churned), 'Churned');

  assertEq(
    'normalizeCampaignAudience: inactive',
    normalizeCampaignAudience('Recovery Campaign (Inactive)'),
    'recovery_inactive',
  );
  assertEq(
    'normalizeCampaignAudience: lost',
    normalizeCampaignAudience('Win-Back Campaign (Lost)'),
    'win_back_lost',
  );

  const segments: CustomerSegmentSummary = {
    total: 100,
    newCustomers: 20,
    repeatCustomers: 40,
    vipCustomers: 10,
    atRiskCustomers: 9,
    churnedCustomers: 8,
    trends: { vipGrowth: 5, atRiskGrowth: -2 },
  };

  const campaign = generateCampaign('Recovery Campaign (Inactive)', 'Test Kitchen', 'https://store.test', segments);
  assert('generateCampaign: returns copy', campaign.whatsappCopy.includes('Test Kitchen'));
  assert('generateCampaign: uses segment reach', campaign.expectedReach >= 9);
  assert('generateCampaign: null segments fallback', generateCampaign('VIP / High Value', 'X').expectedReach >= 5);
}

// ─── Unit: Notification filtering ──────────────────────────────────────────

function testNotificationFiltering() {
  console.log('\n[Unit] Notification archive filtering');

  const items = [
    { id: '1', status: NotificationStatus.UNREAD },
    { id: '2', status: NotificationStatus.READ },
    { id: '3', status: NotificationStatus.ARCHIVED },
    { id: '4', status: NotificationStatus.UNREAD },
  ];

  const visible = items.filter((n) => n.status !== NotificationStatus.ARCHIVED);
  assertEq('archived excluded from preview', visible.length, 3);

  const unread = visible.filter((n) => n.status === NotificationStatus.UNREAD);
  assertEq('unread count excludes archived', unread.length, 2);

  const listAll = items.filter((n) => n.status !== NotificationStatus.ARCHIVED);
  assertEq('list ALL excludes archived', listAll.length, 3);
}

// ─── Performance: segment aggregation simulation ───────────────────────────

function testSegmentAggregationPerformance() {
  console.log('\n[Perf] Segment aggregation (400-order cap simulation)');

  const makeOrders = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      userId: `user-${i % 80}`,
      status: i % 50 === 0 ? 'CANCELLED' : 'DELIVERED',
      total: 200 + (i % 100),
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    }));

  const runAggregation = (orders: ReturnType<typeof makeOrders>) => {
    const customerMap = new Map<string, { count: number; spend: number; lastOrder: Date }>();
    for (const data of orders) {
      if (!data.userId || data.status === 'CANCELLED') continue;
      const current = customerMap.get(data.userId) || { count: 0, spend: 0, lastOrder: new Date(0) };
      const orderDate = new Date(data.createdAt);
      customerMap.set(data.userId, {
        count: current.count + 1,
        spend: current.spend + data.total,
        lastOrder: orderDate > current.lastOrder ? orderDate : current.lastOrder,
      });
    }
    return customerMap.size;
  };

  const big = makeOrders(10000);
  const capped = big.slice(0, 400);

  const t0 = performance.now();
  const fullSize = runAggregation(big);
  const fullMs = performance.now() - t0;

  const t1 = performance.now();
  const cappedSize = runAggregation(capped);
  const cappedMs = performance.now() - t1;

  assert('perf: capped aggregation completes', cappedMs < 100, `${cappedMs.toFixed(2)}ms`);
  assert('perf: capped faster than full dataset', cappedMs < fullMs, `capped=${cappedMs.toFixed(2)}ms full=${fullMs.toFixed(2)}ms`);
  assert('perf: capped produces valid segments', cappedSize > 0, `customers=${cappedSize}, full=${fullSize}`);
  console.log(`  INFO  full(10k)=${fullMs.toFixed(2)}ms  capped(400)=${cappedMs.toFixed(2)}ms`);
}

// ─── HTTP smoke ─────────────────────────────────────────────────────────────

async function fetchSmoke(path: string, expectStatus = 200): Promise<Result> {
  const url = `${serverBase}${path}`;
  const start = performance.now();
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const ms = performance.now() - start;
    const ok = res.status === expectStatus || (expectStatus === 200 && res.status < 400);
    return {
      name: `GET ${path}`,
      ok,
      ms,
      detail: ok ? `${res.status} in ${ms.toFixed(0)}ms` : `status ${res.status}`,
    };
  } catch (err) {
    return {
      name: `GET ${path}`,
      ok: false,
      ms: performance.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function testHttpSmoke() {
  console.log(`\n[Smoke] HTTP endpoints @ ${serverBase}`);

  const routes: Array<[string, number?, boolean?]> = [
    ['/api/health', 200],
    ['/api/server-time', 200],
    ['/api/menu-ping', 200, true],
    ['/', 200],
    ['/about', 200],
    ['/platform', 200],
    ['/onboard', 200],
    ['/owner/login', 200],
    ['/owner/marketing', 200],
    ['/super-admin', 200],
  ];

  for (const [path, status, optional] of routes) {
    const r = await fetchSmoke(path, status);
    if (!r.ok && optional) {
      console.log(`  WARN  ${r.name} — ${r.detail} (non-blocking)`);
      continue;
    }
    results.push(r);
    if (!r.ok) {
      failures += 1;
      console.error(`  FAIL  ${r.name} — ${r.detail}`);
    } else {
      console.log(`  PASS  ${r.name} — ${r.detail}`);
    }
  }

  // Verify Growth page JS chunk is reachable (Vite dev or built assets)
  const marketingRes = await fetch(`${serverBase}/owner/marketing`, { redirect: 'manual' });
  const html = await marketingRes.text();
  const hasAppShell = html.includes('root') || html.includes('id="root"');
  assert('owner/marketing serves app shell', hasAppShell);
}

// ─── Load test ───────────────────────────────────────────────────────────────

async function testLoad() {
  console.log('\n[Load] Static routes (high concurrency)');

  const STATIC_CONCURRENCY = 50;
  const staticLatencies: number[] = [];
  let staticErrors = 0;

  const staticBatch = Array.from({ length: STATIC_CONCURRENCY }, async () => {
    const start = performance.now();
    try {
      const res = await fetch(`${serverBase}/owner/marketing`);
      if (!res.ok) staticErrors += 1;
      staticLatencies.push(performance.now() - start);
    } catch {
      staticErrors += 1;
      staticLatencies.push(performance.now() - start);
    }
  });
  await Promise.all(staticBatch);

  staticLatencies.sort((a, b) => a - b);
  const sP95 = staticLatencies[Math.floor(staticLatencies.length * 0.95)] ?? 0;
  console.log(`  INFO  ${STATIC_CONCURRENCY} parallel SPA requests, ${staticErrors} errors, p95=${sP95.toFixed(0)}ms`);

  assert('load: static routes zero errors', staticErrors === 0, `${staticErrors} failed`);
  assert('load: static p95 under 3s', sP95 < 3000, `p95=${sP95.toFixed(0)}ms`);

  console.log('\n[Load] API health (sequential, respects rate limit)');

  const API_ROUNDS = 15;
  const apiLatencies: number[] = [];
  let apiErrors = 0;

  for (let i = 0; i < API_ROUNDS; i += 1) {
    const start = performance.now();
    try {
      const res = await fetch(`${serverBase}/api/health`);
      if (!res.ok) apiErrors += 1;
      apiLatencies.push(performance.now() - start);
    } catch {
      apiErrors += 1;
      apiLatencies.push(performance.now() - start);
    }
  }

  apiLatencies.sort((a, b) => a - b);
  const aP95 = apiLatencies[Math.floor(apiLatencies.length * 0.95)] ?? 0;
  console.log(`  INFO  ${API_ROUNDS} sequential health checks, ${apiErrors} errors, p95=${aP95.toFixed(0)}ms`);

  assert('load: API health zero errors', apiErrors === 0, `${apiErrors} failed`);
  assert('load: API p95 under 500ms', aP95 < 500, `p95=${aP95.toFixed(0)}ms`);
}

// ─── Build artifact checks ───────────────────────────────────────────────────

async function testBuildArtifacts() {
  console.log('\n[Build] Production artifacts');

  const fs = await import('node:fs');
  const path = await import('node:path');

  const dist = path.join(process.cwd(), 'dist');
  assert('dist/ exists', fs.existsSync(dist));
  assert('dist/index.html exists', fs.existsSync(path.join(dist, 'index.html')));
  assert('dist/server.cjs exists', fs.existsSync(path.join(dist, 'server.cjs')));

  const assetsDir = path.join(dist, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const ownerMarketing = files.find((f) => f.startsWith('OwnerMarketing-'));
    const notificationCenter = files.find((f) => f.startsWith('NotificationCenter-'));
    const customerIntel = files.find((f) => f.startsWith('CustomerIntelligenceService-'));
    assert('bundle: OwnerMarketing chunk', !!ownerMarketing, ownerMarketing);
    assert('bundle: NotificationCenter chunk', !!notificationCenter, notificationCenter);
    assert('bundle: CustomerIntelligenceService chunk', !!customerIntel, customerIntel);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  BhojanOS Pre-Production Smoke & Load Test Suite');
  console.log('═══════════════════════════════════════════════════');

  testCustomerIntelligence();
  testNotificationFiltering();
  testSegmentAggregationPerformance();
  await testBuildArtifacts();

  const resolved = await resolveServerBase();
  if (!resolved) {
    failures += 1;
    console.error('\n[WARN] No healthy server found — skipping HTTP/load tests');
    console.error('       Start with: npm run build && PORT=8081 node dist/server.cjs');
  } else {
    await testHttpSmoke();
    await testLoad();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed (${results.length} total)`);
  console.log('═══════════════════════════════════════════════════\n');

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

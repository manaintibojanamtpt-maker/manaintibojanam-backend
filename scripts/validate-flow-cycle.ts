/**
 * Validates critical sign-in → order flow modules and HTTP surfaces.
 * Run: npx tsx scripts/validate-flow-cycle.ts [--base=http://localhost:8080]
 */
import fs from 'node:fs';
import path from 'node:path';

const base =
  process.argv.find((a) => a.startsWith('--base='))?.split('=')[1] ?? 'http://localhost:8080';

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
let failures = 0;

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name: string, detail?: string) {
  failures += 1;
  checks.push({ name, ok: false, detail });
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function expectStatus(
  name: string,
  path: string,
  method: 'GET' | 'POST' = 'GET',
  expected: number | number[] = 200,
  body?: object,
) {
  const expectedList = Array.isArray(expected) ? expected : [expected];
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });
    if (expectedList.includes(res.status)) {
      pass(name, `HTTP ${res.status}`);
      return res;
    }
    fail(name, `expected ${expectedList.join('|')}, got ${res.status}`);
  } catch (err) {
    fail(name, err instanceof Error ? err.message : String(err));
  }
  return null;
}

async function validateHttpSurfaces() {
  console.log(`\n[Flow] HTTP surfaces @ ${base}`);

  await expectStatus('Health', '/api/health');
  await expectStatus('Marketing home', '/onboard');
  await expectStatus('Owner login page', '/owner/login');
  await expectStatus('Owner register page', '/owner/register');
  await expectStatus('Customer login page', '/login');
  await expectStatus('Checkout shell', '/checkout');

  // Owner APIs must exist (401 without token — not 404)
  await expectStatus('Owner provision API', '/api/owner/provision', 'POST', 401, {});
  await expectStatus('Owner sync-tenants API', '/api/owner/sync-tenants', 'POST', 401, {});

  const regRes = await expectStatus(
    'Register owner pre-check',
    '/api/register-owner-check',
    'POST',
    [200, 400, 403, 500],
    { email: 'flow-test@example.com', fingerprint: 'validate-flow-cycle' },
  );
  if (regRes?.ok) {
    const payload = await regRes.json().catch(() => ({}));
    if (payload.success === true || regRes.status === 400) {
      pass('Register pre-check payload', JSON.stringify(payload).slice(0, 80));
    } else if (regRes.status === 500) {
      fail('Register pre-check payload', payload.error || 'server error');
    }
  }
}

function validateModuleGraph() {
  console.log('\n[Flow] Module files present');

  const modules = [
    'src/lib/ownerProvisioning.ts',
    'src/lib/ownerAccess.ts',
    'src/pages/owner/OwnerLogin.tsx',
    'src/pages/owner/OwnerRegister.tsx',
    'src/pages/Checkout.tsx',
    'src/pages/OrderSuccess.tsx',
    'src/pages/Login.tsx',
    'src/services/api.ts',
    'src/context/AuthContext.tsx',
  ];

  for (const mod of modules) {
    const full = path.join(process.cwd(), mod);
    if (fs.existsSync(full)) pass(`File exists: ${mod}`);
    else fail(`File exists: ${mod}`);
  }
}

function validateOwnerFlowContract() {
  console.log('\n[Flow] Owner signup contract (static)');

  const ownerReg = fs.readFileSync('src/pages/owner/OwnerRegister.tsx', 'utf8');
  const ownerProv = fs.readFileSync('src/lib/ownerProvisioning.ts', 'utf8');
  const ownerAccess = fs.readFileSync('src/lib/ownerAccess.ts', 'utf8');
  const server = fs.readFileSync('server.ts', 'utf8');

  if (ownerReg.includes('provisionOwnerStore') && !ownerReg.includes('provisionOwnerTenant')) {
    pass('OwnerRegister uses server provisioning');
  } else {
    fail('OwnerRegister uses server provisioning', 'still references client Firestore provision');
  }

  if (ownerProv.includes('/api/owner/provision') && ownerProv.includes('/api/owner/sync-tenants')) {
    pass('Owner provisioning client calls backend APIs');
  } else {
    fail('Owner provisioning client calls backend APIs');
  }

  if (!ownerAccess.includes('setDoc(userRef') && ownerAccess.includes('syncOwnerTenantsViaApi')) {
    pass('Owner tenant repair uses server sync (not blocked Firestore writes)');
  } else {
    fail('Owner tenant repair uses server sync');
  }

  if (server.includes("app.post('/api/owner/provision'") && server.includes("app.post('/api/owner/sync-tenants'")) {
    pass('Server exposes owner provision + sync routes');
  } else {
    fail('Server exposes owner provision + sync routes');
  }
}

function validateOrderFlowContract() {
  console.log('\n[Flow] Customer order contract (static)');

  const checkout = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');
  const api = fs.readFileSync('src/services/api.ts', 'utf8');
  const orderSuccess = fs.readFileSync('src/pages/OrderSuccess.tsx', 'utf8');

  if (checkout.includes('createOrder(orderData)') && checkout.includes('order-success')) {
    pass('Checkout COD path creates order and navigates to success');
  } else {
    fail('Checkout COD path');
  }

  if (api.includes('export const createOrder') && api.includes("collection(getDb(), 'orders')")) {
    pass('createOrder writes to Firestore orders collection');
  } else {
    fail('createOrder implementation');
  }

  if (orderSuccess.includes("searchParams.get('orderId')") && orderSuccess.includes("doc(getDb(), 'orders'")) {
    pass('OrderSuccess loads order by orderId');
  } else {
    fail('OrderSuccess load path');
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  BhojanOS Flow Cycle Validation');
  console.log('═══════════════════════════════════════════════════');

  validateModuleGraph();
  validateOwnerFlowContract();
  validateOrderFlowContract();
  await validateHttpSurfaces();

  const passed = checks.filter((c) => c.ok).length;
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failures} failed (${checks.length} total)`);
  console.log('═══════════════════════════════════════════════════');

  console.log(`
Manual E2E (localhost ${base}):

  OWNER — Google signup
  1. Incognito → /owner/register
  2. Fill name + restaurant name + mobile
  3. Sign up with Google → should land on /owner/setup (not permission error)

  OWNER — Returning login
  4. Sign out → /owner/login → Continue with Google
  5. Should reach /owner/setup or /owner/dashboard (not "no store found")

  OWNER — Publish test menu (if new store)
  6. Complete setup wizard → add at least 1 menu item → publish/sandbox store

  CUSTOMER — Order cycle
  7. Open /k/{your-slug}/menu (or sandbox preview from owner dashboard)
  8. Add item → checkout → sign in with phone/Google if prompted
  9. Choose Cash on Delivery → place order
  10. Confirm /k/{slug}/order-success?orderId=... shows order details

  OWNER — Fulfill
  11. /owner/orders → new order visible → advance status
`);

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

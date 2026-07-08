#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function run(label, command, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n[gate:prod] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredFiles = [
  'src/features/orders/hooks/useOrdersList.ts',
  'src/features/tracking/ui/TrackingPage.tsx',
  'src/features/favorites/ui/FavoritesPage.tsx',
  'src/features/notifications/ui/NotificationsPage.tsx',
  'src/features/cart/hooks/useCartValidation.ts',
  'src/features/checkout/ui/CheckoutPage.tsx',
  'tests/m10-orders.test.ts',
  'tests/m11-tracking.test.ts',
  'tests/m12-customer.test.ts',
  '.env.example',
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    console.error(`[gate:prod] Missing file: ${file}`);
    process.exit(1);
  }
}

const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
if (router.includes('FeaturePlaceholderPage')) {
  console.error('[gate:prod] AppRouter must not use FeaturePlaceholderPage for customer routes');
  process.exit(1);
}

const vite = readFileSync(join(root, 'vite.config.ts'), 'utf8');
if (!vite.includes('create-razorpay-order') || !vite.includes('verify-razorpay-payment')) {
  console.error('[gate:prod] Vite proxy must forward Razorpay payment routes');
  process.exit(1);
}

run('Unit tests (M0–M12 + sync)', 'npm', ['run', 'test:unit']);
run('Production build', 'npm', ['run', 'build']);

console.log('\n=== OrderBhojan production readiness gate PASSED ===');

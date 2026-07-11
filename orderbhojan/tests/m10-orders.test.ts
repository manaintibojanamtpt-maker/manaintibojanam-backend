import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M10 orders module structure', () => {
  const requiredFiles = [
    'src/features/orders/hooks/useOrdersList.ts',
    'src/features/orders/hooks/ordersQueryKeys.ts',
    'src/presentation/orders/OrderBhojanOrderSummaryCard.tsx',
    'src/presentation/orders/OrderBhojanOrdersExperience.tsx',
  ];

  for (const file of requiredFiles) {
    it(`includes ${file}`, () => {
      statSync(join(root, file));
    });
  }

  it('orders page loads list via marketplace client hook', () => {
    const page = readFileSync(join(root, 'src/presentation/orders/OrderBhojanOrdersExperience.tsx'), 'utf8');
    assert.match(page, /useOrdersList/);
    assert.match(page, /OrdersListPageView/);
  });

  it('router wires orders list behind auth', () => {
    const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
    assert.match(router, /OrdersExperiencePage/);
    assert.match(router, /RequireAuth/);
    assert.doesNotMatch(router, /FeaturePlaceholderPage.*Orders/);
  });

  it('marketplace client exposes listOrders', () => {
    const client = readFileSync(join(root, 'src/marketplace-api/index.ts'), 'utf8');
    assert.match(client, /listOrders/);
  });

  it('checkout success navigates to tracking', () => {
    const checkout = readFileSync(join(root, 'src/presentation/checkout/OrderBhojanCheckoutPage.tsx'), 'utf8');
    assert.match(checkout, /\/orders\/\$\{orderId\}\/track/);
  });
});

import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M11 tracking module structure', () => {
  const requiredFiles = [
    'src/features/tracking/hooks/useOrderTracking.ts',
    'src/presentation/tracking/OrderBhojanTrackingPage.tsx',
    'src/presentation/tracking/OrderBhojanOrderTimeline.tsx',
  ];

  for (const file of requiredFiles) {
    it(`includes ${file}`, () => {
      statSync(join(root, file));
    });
  }

  it('router wires tracking page without placeholder', () => {
    const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
    assert.match(router, /TrackingPage/);
    assert.match(router, /orders\/:orderId\/track/);
    assert.doesNotMatch(router, /FeaturePlaceholderPage.*Tracking/);
  });

  it('marketplace client exposes guest tracking', () => {
    const client = readFileSync(join(root, 'src/marketplace-api/index.ts'), 'utf8');
    assert.match(client, /getGuestTracking/);
    assert.match(client, /getTracking/);
  });

  it('MSW handlers expose guest tracking endpoint', () => {
    const handlers = readFileSync(join(root, 'src/marketplace-api/mocks/handlers.ts'), 'utf8');
    assert.match(handlers, /guest-tracking/);
  });

  it('tracking hook polls on interval', () => {
    const hook = readFileSync(join(root, 'src/features/tracking/hooks/useOrderTracking.ts'), 'utf8');
    assert.match(hook, /refetchInterval/);
  });
});

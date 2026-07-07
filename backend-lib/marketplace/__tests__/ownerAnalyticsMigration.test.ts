import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('owner analytics API migration', () => {
  it('registers authenticated owner analytics routes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/ownerAnalyticsRoutes.ts'),
      'utf8',
    );
    for (const route of [
      "app.get('/api/owner/analytics'",
      "app.post('/api/owner/analytics/backfill'",
      "app.post('/api/owner/analytics/order-completion'",
    ]) {
      assert.match(source, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.match(source, /assertOwnerTenantAccess/);
  });

  it('analytics service delegates owner analytics to API', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/services/AnalyticsService.ts'),
      'utf8',
    );
    assert.match(source, /fetchOwnerAnalytics/);
    assert.match(source, /backfillOwnerAnalytics/);
    assert.match(source, /recordOwnerOrderCompletion/);
    assert.doesNotMatch(source, /getDoc/);
    assert.doesNotMatch(source, /getDocs/);
  });

  it('owner dashboard loads analytics via AnalyticsService API wrappers', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OwnerDashboard.tsx'),
      'utf8',
    );
    assert.match(source, /getTenantAnalytics|backfillAnalytics/);
    assert.doesNotMatch(source, /firebase\/firestore/);
  });

  it('owner orders records completion via AnalyticsService API wrapper', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OwnerOrders.tsx'),
      'utf8',
    );
    assert.match(source, /recordOrderCompletion/);
    assert.doesNotMatch(source, /firebase\/firestore/);
  });
});

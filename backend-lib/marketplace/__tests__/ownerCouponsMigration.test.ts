import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('owner coupons API migration', () => {
  it('registers authenticated owner coupon routes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/ownerCouponsRoutes.ts'),
      'utf8',
    );
    for (const route of [
      "app.get('/api/owner/coupons'",
      "app.post('/api/owner/coupons'",
      "app.patch('/api/owner/coupons/:id'",
      "app.delete('/api/owner/coupons/:id'",
    ]) {
      assert.match(source, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.match(source, /assertOwnerTenantAccess/);
  });

  it('promotions panel uses owner coupons API instead of Firestore', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OwnerPromotionsPanel.tsx'),
      'utf8',
    );
    assert.match(source, /fetchOwnerCoupons|createOwnerCoupon/);
    assert.doesNotMatch(source, /firebase\/firestore/);
    assert.doesNotMatch(source, /getDb\(\)/);
  });

  it('onboarding wizard loads menu count via owner menu API', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OnboardingWizard.tsx'),
      'utf8',
    );
    assert.match(source, /fetchOwnerMenuItems/);
    assert.doesNotMatch(source, /onSnapshot/);
    assert.doesNotMatch(source, /firebase\/firestore/);
  });
});

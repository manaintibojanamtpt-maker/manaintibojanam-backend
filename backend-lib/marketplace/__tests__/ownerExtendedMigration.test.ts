import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { computeDeliveryIntelligenceMetrics } from '../../../src/lib/deliveryIntelligenceMetrics';

describe('owner extended API migration', () => {
  it('registers subscription and recipes routes', () => {
    const subscription = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/ownerSubscriptionRoutes.ts'),
      'utf8',
    );
    assert.match(subscription, /app\.put\('\/api\/owner\/subscription\/plan'/);
    assert.match(subscription, /app\.post\('\/api\/owner\/subscription\/checkout'/);
    assert.match(subscription, /app\.post\('\/api\/owner\/subscription\/confirm-payment'/);
    assert.match(subscription, /assertOwnerTenantAccess/);

    const recipes = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/ownerRecipesRoutes.ts'),
      'utf8',
    );
    assert.match(recipes, /app\.get\('\/api\/owner\/recipes'/);
    assert.match(recipes, /app\.put\('\/api\/owner\/recipes\/:menuItemId'/);
  });

  it('subscription page uses owner subscription API instead of Firestore', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OwnerSubscription.tsx'),
      'utf8',
    );
    assert.match(source, /upgradeOwnerSubscriptionPlan|activateGrowthOnboardingTrial|runOwnerSubscriptionPayment/);
    assert.doesNotMatch(source, /firebase\/firestore/);
    assert.doesNotMatch(source, /getDb\(\)/);
  });

  it('delivery intelligence loads orders via owner orders API', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/DeliveryIntelligence.tsx'),
      'utf8',
    );
    assert.match(source, /fetchOwnerOrdersFromApi/);
    assert.match(source, /computeDeliveryIntelligenceMetrics/);
    assert.doesNotMatch(source, /firebase\/firestore/);
    assert.doesNotMatch(source, /getDb\(\)/);
  });

  it('recipes page uses owner menu and recipes APIs', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OwnerRecipes.tsx'),
      'utf8',
    );
    assert.match(source, /fetchOwnerMenuItems/);
    assert.match(source, /fetchOwnerRecipes|saveOwnerRecipe/);
    assert.doesNotMatch(source, /firebase\/firestore/);
    assert.doesNotMatch(source, /getDb\(\)/);
  });

  it('recipe service delegates to owner recipes API', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/services/RecipeService.ts'),
      'utf8',
    );
    assert.match(source, /fetchOwnerRecipes|saveOwnerRecipe/);
    assert.doesNotMatch(source, /firebase\/firestore/);
    assert.doesNotMatch(source, /getDb\(\)/);
  });
});

describe('deliveryIntelligenceMetrics', () => {
  it('computes success rate and top areas from delivered orders', () => {
    const metrics = computeDeliveryIntelligenceMetrics([
      {
        status: 'DELIVERED',
        deliveryFee: 30,
        totalAmount: 250,
        deliveryAddress: { city: 'Kothrud' },
      },
      {
        status: 'CANCELLED',
        deliveryFee: 20,
        totalAmount: 180,
        deliveryAddress: 'Line 1, Kothrud, Pune',
      },
      {
        status: 'DELIVERED',
        deliveryFee: 40,
        totalAmount: 320,
        deliveryAddress: { city: 'Baner' },
      },
    ]);

    assert.equal(metrics.totalDeliveries, 3);
    assert.equal(metrics.successRate, (2 / 3) * 100);
    assert.equal(metrics.topAreas[0].name, 'Baner');
    assert.equal(metrics.topAreas[0].revenue, 320);
  });
});

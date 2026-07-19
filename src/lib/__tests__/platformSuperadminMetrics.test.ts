import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computePlatformSuperadminMetrics } from '../platformSuperadminMetrics';

describe('platformSuperadminMetrics', () => {
  it('computes MRR from active paid subscriptions, not tenant count heuristics', () => {
    const metrics = computePlatformSuperadminMetrics([
      { id: 'a', status: 'active', subscription: { planId: 'growth', status: 'active' } },
      { id: 'b', status: 'active', subscription: { planId: 'pro', status: 'active' } },
      { id: 'c', status: 'active', subscription: { planId: 'starter', status: 'active' } },
      { id: 'd', status: 'trialing', subscription: { planId: 'growth', status: 'trialing' } },
    ]);

    assert.equal(metrics.mrr, 999 + 2999);
    assert.equal(metrics.arr, metrics.mrr * 12);
    assert.equal(metrics.arpu, Math.round(metrics.mrr / 2));
    assert.equal(metrics.activeSubscriptions, 2);
    assert.equal(metrics.activeTenantsCount, 3);
    assert.equal(metrics.trialTenantsCount, 1);
  });

  it('aggregates production order and GMV totals from tenant analytics', () => {
    const metrics = computePlatformSuperadminMetrics(
      [{ id: 'kitchen-a', status: 'active' }, { id: 'kitchen-b', status: 'active' }],
      {
        'kitchen-a': { totalOrders: 12, totalRevenue: 4800 },
        'kitchen-b': { totalOrders: 8, totalRevenue: 3200 },
      },
    );

    assert.equal(metrics.ordersProcessed, 20);
    assert.equal(metrics.platformGmv, 8000);
  });

  it('counts churn risk from payment-due and dunning states', () => {
    const metrics = computePlatformSuperadminMetrics([
      { id: 'a', status: 'payment_due', subscription: { planId: 'growth', status: 'active' } },
      {
        id: 'b',
        status: 'active',
        subscription: { planId: 'pro', status: 'past_due', dunningStatus: 'in_recovery' },
      },
      { id: 'c', status: 'active', subscription: { planId: 'growth', status: 'active' } },
    ]);

    assert.equal(metrics.churnRisk, 2);
  });

  it('derives beta and first-order counts from tenant records', () => {
    const metrics = computePlatformSuperadminMetrics([
      { id: 'a', status: 'active', beta: { isBetaUser: true, firstOrderDate: '2026-01-01' } },
      { id: 'b', status: 'active', beta: { isBetaUser: true } },
      { id: 'c', status: 'active', firstOrderDate: '2026-02-01' },
    ]);

    assert.equal(metrics.betaMerchantsCount, 2);
    assert.equal(metrics.betaPublishedCount, 2);
    assert.equal(metrics.firstOrdersCount, 2);
  });
});

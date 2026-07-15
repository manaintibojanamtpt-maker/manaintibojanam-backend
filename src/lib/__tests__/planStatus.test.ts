import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getOwnerPlanActionLabel,
  isGrowthTrialExpired,
  isOwnerPlanActionable,
  ownerPlanRequiresPayment,
} from '../planStatus';

const expiredTrialTenant = {
  status: 'trialing',
  subscription: {
    planId: 'growth',
    status: 'trialing',
    trialExpiresAt: '2020-01-01T00:00:00.000Z',
    onboardingTrial: true,
  },
};

describe('planStatus trial expiry', () => {
  it('detects expired growth trial', () => {
    assert.equal(isGrowthTrialExpired(expiredTrialTenant), true);
  });

  it('shows pay CTA instead of current plan when trial expired', () => {
    const label = getOwnerPlanActionLabel('growth', 'Growth', 'Upgrade to Growth', expiredTrialTenant);
    assert.match(label, /Pay ₹999\/mo to continue/);
  });

  it('keeps growth plan actionable after trial expiry', () => {
    assert.equal(isOwnerPlanActionable(expiredTrialTenant, 'growth'), true);
    assert.equal(ownerPlanRequiresPayment(expiredTrialTenant, 'growth'), true);
  });
});

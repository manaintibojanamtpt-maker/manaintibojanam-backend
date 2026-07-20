import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { couponBelongsToTenant } from '../couponTenantScope';

describe('couponTenantScope', () => {
  it('accepts coupon when tenant id or slug matches', () => {
    assert.equal(couponBelongsToTenant({ tenantId: 'mana-inti' }, 'mana-inti', 'mana-inti'), true);
    assert.equal(couponBelongsToTenant({ tenantId: 'mana-inti' }, 'manaintibojanam', 'mana-inti'), true);
  });

  it('rejects coupon for a different kitchen', () => {
    assert.equal(
      couponBelongsToTenant({ tenantId: 'mana-inti' }, 'inti-bhojanam-pune', 'inti-bhojanam-pune'),
      false,
    );
  });

  it('rejects coupons without tenantId', () => {
    assert.equal(couponBelongsToTenant({ tenantId: '' }, 'mana-inti'), false);
    assert.equal(couponBelongsToTenant({}, 'mana-inti'), false);
  });
});

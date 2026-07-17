import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isOwnerDeliveryConfigured,
  isOwnerOnlinePaymentEnabled,
  isOwnerPayoutsConfigured,
} from '../ownerDashboardStatus';
import type { TenantInfo } from '../../context/TenantContext';

describe('ownerDashboardStatus', () => {
  it('detects delivery when maxRadius is configured', () => {
    const tenant = {
      deliveryConfig: { enabled: true, maxRadius: 5, freeRadius: 0, paidRadius: 3 },
    } as TenantInfo;
    assert.equal(isOwnerDeliveryConfigured(tenant), true);
  });

  it('reports delivery not set when deliveryConfig missing or disabled', () => {
    assert.equal(isOwnerDeliveryConfigured(null), false);
    assert.equal(
      isOwnerDeliveryConfigured({ deliveryConfig: { enabled: false, maxRadius: 10 } } as TenantInfo),
      false,
    );
    assert.equal(
      isOwnerDeliveryConfigured({ deliveryConfig: { enabled: true, maxRadius: 0 } } as TenantInfo),
      false,
    );
  });

  it('detects payouts from payment providers not KYC', () => {
    assert.equal(
      isOwnerPayoutsConfigured({
        paymentConfig: { defaultProvider: 'cod', providers: { cod: { enabled: true } } },
      } as TenantInfo),
      true,
    );
    assert.equal(
      isOwnerPayoutsConfigured({ kyc: { verificationLevel: 2 } } as TenantInfo),
      false,
    );
  });

  it('detects online payments from razorpay or direct upi', () => {
    assert.equal(
      isOwnerOnlinePaymentEnabled({
        paymentConfig: { defaultProvider: 'upi', providers: { upi: { enabled: true, upiId: 'a@paytm' } } },
      } as TenantInfo),
      true,
    );
    assert.equal(
      isOwnerOnlinePaymentEnabled({
        paymentConfig: { defaultProvider: 'razorpay', providers: { razorpay: { enabled: true } } },
      } as TenantInfo),
      true,
    );
  });
});

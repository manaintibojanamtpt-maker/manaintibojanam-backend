import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeDeliveryFee } from '../deliveryFee';
import {
  formatTaxAndChargesLabel,
  hasValidDeliveryCoordinates,
  resolveCheckoutDeliveryFee,
  resolveTenantPricing,
} from '../tenantCheckoutConfig';
import type { TenantInfo } from '../../context/TenantContext';

const ownerTenant = (overrides: Partial<TenantInfo> = {}): TenantInfo => ({
  id: 'tenant-a',
  slug: 'tenant-a',
  name: 'Test Kitchen',
  status: 'active',
  location: { lat: 17.385, lng: 78.4867, address: 'Kitchen' },
  deliveryConfig: {
    enabled: true,
    freeRadius: 0,
    paidRadius: 5,
    maxRadius: 10,
    baseFee: 20,
    perKmCharge: 0,
    prepTime: 20,
    feesConfigured: true,
  },
  pricingConfig: {
    gstPercent: 0,
    packingFee: 0,
  },
  ...overrides,
});

describe('tenantCheckoutConfig (GA-3 billing hotfix)', () => {
  describe('resolveTenantPricing', () => {
    it('prefers owner storefront config over legacy global fees for mana-inti', () => {
      const tenant = ownerTenant({ id: 'mana-inti', slug: 'mana-inti' });
      const pricing = resolveTenantPricing('mana-inti', tenant, {
        gst: 5,
        packingFee: 10,
        deliveryFee: 30,
      });

      assert.equal(pricing.gstPercent, 0);
      assert.equal(pricing.packingFee, 0);
      assert.equal(pricing.baseDeliveryFee, 20);
      assert.equal(pricing.usesLegacyGlobalFees, false);
    });

    it('falls back to legacy global fees only when storefront config is missing', () => {
      const pricing = resolveTenantPricing('mana-inti', null, {
        gst: 5,
        packingFee: 10,
        deliveryFee: 30,
      });

      assert.equal(pricing.gstPercent, 5);
      assert.equal(pricing.packingFee, 10);
      assert.equal(pricing.baseDeliveryFee, 30);
      assert.equal(pricing.usesLegacyGlobalFees, true);
    });

    it('uses zero defaults for non-legacy tenants without config', () => {
      const pricing = resolveTenantPricing('new-tenant', null, {});

      assert.equal(pricing.gstPercent, 0);
      assert.equal(pricing.packingFee, 0);
      assert.equal(pricing.baseDeliveryFee, 0);
      assert.equal(pricing.feesConfigured, false);
    });

    it('reads GST and packaging from owner pricingConfig', () => {
      for (const gstPercent of [0, 5, 12, 18]) {
        for (const packingFee of [0, 10, 25]) {
          const tenant = ownerTenant({
            pricingConfig: { gstPercent, packingFee },
          });
          const pricing = resolveTenantPricing('tenant-a', tenant, {});
          assert.equal(pricing.gstPercent, gstPercent);
          assert.equal(pricing.packingFee, packingFee);
        }
      }
    });

    it('supports packagingFee alias on older tenant documents', () => {
      const tenant = ownerTenant({
        pricingConfig: { gstPercent: 5, packagingFee: 15 } as TenantInfo['pricingConfig'],
      });
      const pricing = resolveTenantPricing('tenant-a', tenant, {});
      assert.equal(pricing.packingFee, 15);
    });
  });

  describe('formatTaxAndChargesLabel', () => {
    it('builds dynamic bill summary labels', () => {
      assert.equal(formatTaxAndChargesLabel(0, 0), 'Taxes and Charges');
      assert.equal(formatTaxAndChargesLabel(5, 0), 'GST (5%)');
      assert.equal(formatTaxAndChargesLabel(0, 10), 'Packaging');
      assert.equal(formatTaxAndChargesLabel(12, 25), 'GST (12%) + Packaging');
    });
  });

  describe('hasValidDeliveryCoordinates', () => {
    it('requires finite non-zero coordinates', () => {
      assert.equal(hasValidDeliveryCoordinates(null), false);
      assert.equal(hasValidDeliveryCoordinates({ lat: 0, lng: 0 }), false);
      assert.equal(hasValidDeliveryCoordinates({ lat: 17.4, lng: 78.4 }), true);
    });
  });

  describe('resolveCheckoutDeliveryFee', () => {
    const pricing = resolveTenantPricing('tenant-a', ownerTenant(), {});

    it('does not calculate delivery before address selection', () => {
      const result = resolveCheckoutDeliveryFee({
        orderType: 'delivery',
        tenantInfo: ownerTenant(),
        address: { address: 'No coords' } as any,
        subtotal: 249,
        pricing,
      });

      assert.equal(result.pending, true);
      assert.equal(result.fee, 0);
    });

    it('uses owner base fee inside paid radius', () => {
      const result = resolveCheckoutDeliveryFee({
        orderType: 'delivery',
        tenantInfo: ownerTenant(),
        address: { lat: 17.39, lng: 78.49, distanceKm: 2 },
        subtotal: 249,
        pricing,
      });

      assert.equal(result.pending, false);
      assert.equal(result.fee, 20);
    });

    it('adds per-km charge beyond paid radius', () => {
      const tenant = ownerTenant({
        deliveryConfig: {
          enabled: true,
          freeRadius: 0,
          paidRadius: 3,
          maxRadius: 10,
          baseFee: 20,
          perKmCharge: 5,
          prepTime: 20,
          feesConfigured: true,
        },
      });
      const result = resolveCheckoutDeliveryFee({
        orderType: 'delivery',
        tenantInfo: tenant,
        address: { lat: 17.45, lng: 78.55, distanceKm: 6 },
        subtotal: 249,
        pricing: resolveTenantPricing('tenant-a', tenant, {}),
      });

      assert.equal(result.fee, 35);
    });

    it('returns zero fee for pickup', () => {
      const result = resolveCheckoutDeliveryFee({
        orderType: 'pickup',
        tenantInfo: ownerTenant(),
        address: { lat: 17.39, lng: 78.49 },
        subtotal: 249,
        pricing,
      });

      assert.equal(result.fee, 0);
      assert.equal(result.pending, false);
    });
  });
});

describe('deliveryFee (GA-3 billing hotfix)', () => {
  const configured = {
    enabled: true,
    freeRadius: 0,
    paidRadius: 5,
    maxRadius: 10,
    baseFee: 20,
    perKmCharge: 0,
    feesConfigured: true,
  };

  it('honors owner base fee instead of ₹30 default', () => {
    assert.equal(computeDeliveryFee(2, configured), 20);
  });

  it('returns zero when owner explicitly configured zero fees', () => {
    assert.equal(
      computeDeliveryFee(2, {
        ...configured,
        baseFee: 0,
        perKmCharge: 0,
        feesConfigured: true,
      }),
      0,
    );
  });

  it('uses legacy default only for incomplete zone setup', () => {
    assert.equal(
      computeDeliveryFee(2, {
        enabled: true,
        freeRadius: 0,
        paidRadius: 5,
        maxRadius: 10,
        baseFee: 0,
        perKmCharge: 0,
        feesConfigured: false,
      }),
      30,
    );
  });

  it('marks addresses beyond max radius as unserviceable', () => {
    assert.equal(computeDeliveryFee(12, configured), -1);
  });

  it('applies free radius before base fee', () => {
    assert.equal(
      computeDeliveryFee(1, {
        ...configured,
        freeRadius: 2,
      }),
      0,
    );
  });
});

describe('bill summary totals (GA-3)', () => {
  it('matches subtotal + gst + packaging + delivery for configured tenant', () => {
    const subtotal = 249;
    const tenant = ownerTenant({
      pricingConfig: { gstPercent: 5, packingFee: 10 },
      deliveryConfig: {
        enabled: true,
        freeRadius: 0,
        paidRadius: 5,
        maxRadius: 10,
        baseFee: 20,
        perKmCharge: 0,
        prepTime: 20,
        feesConfigured: true,
      },
    });
    const pricing = resolveTenantPricing('tenant-a', tenant, {});
    const gstAmount = (subtotal * pricing.gstPercent) / 100;
    const packingFee = pricing.packingFee;
    const delivery = resolveCheckoutDeliveryFee({
      orderType: 'delivery',
      tenantInfo: tenant,
      address: { lat: 17.39, lng: 78.49, distanceKm: 2 },
      subtotal,
      pricing,
    }).fee;
    const grandTotal = subtotal + gstAmount + packingFee + delivery;

    assert.equal(gstAmount, 12.45);
    assert.equal(packingFee, 10);
    assert.equal(delivery, 20);
    assert.equal(grandTotal, 291.45);
  });

  it('shows zero taxes when owner configured GST and packaging to zero', () => {
    const subtotal = 249;
    const tenant = ownerTenant();
    const pricing = resolveTenantPricing('tenant-a', tenant, {});
    const gstAmount = pricing.gstPercent > 0 ? (subtotal * pricing.gstPercent) / 100 : 0;
    const packingFee = pricing.packingFee > 0 ? pricing.packingFee : 0;

    assert.equal(gstAmount, 0);
    assert.equal(packingFee, 0);
    assert.equal(gstAmount + packingFee, 0);
  });
});

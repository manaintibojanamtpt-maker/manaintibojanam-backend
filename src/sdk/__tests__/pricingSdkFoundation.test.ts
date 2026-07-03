import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRICING_SDK_FEATURE_FLAG_DEFAULTS,
  PRICING_SDK_FEATURE_FLAG_ENV_KEYS,
} from '../pricing/featureFlags/featureFlags';
import {
  createPricingSDK,
  resolvePricingEnabled,
} from '../pricing/factory/createPricingSDK';
import { createStubPricingAdapter } from '../pricing/adapters/StubPricingAdapter';
import { createDefaultPricingAdapter } from '../pricing/adapters/DefaultPricingAdapter';
import { createStubPricingRepository } from '../pricing/repository/StubPricingRepository';
import {
  PRICING_SDK_FROZEN,
  PRICING_SDK_MODULE,
  PRICING_SDK_VERSION,
} from '../pricing/version';
import {
  PRICING_SDK_FROZEN as FROZEN_BARREL,
  PRICING_SDK_MODULE as MODULE_BARREL,
  PRICING_SDK_VERSION as VERSION_BARREL,
} from '../pricing/types/index';
import type { PricingRepository, TaxRepository } from '../pricing/contracts/ports';
import {
  validateGetPriceQuery,
  validatePricingInput,
} from '../pricing/validation/validatePricingQuery';
import type { TenantId } from '../core/types';
import type { MenuItemId } from '../pricing/types/branded';

const tenantId = 'tenant-pricing-001' as TenantId;
const itemId = 'item-001' as MenuItemId;

describe('PricingSDK foundation (M8 PR-1)', () => {
  it('exports PRICING_SDK_VERSION as 1.0.0', () => {
    assert.equal(PRICING_SDK_VERSION, '1.0.0');
    assert.equal(VERSION_BARREL, '1.0.0');
  });

  it('exports PRICING_SDK_FROZEN as true', () => {
    assert.equal(PRICING_SDK_FROZEN, true);
    assert.equal(FROZEN_BARREL, true);
  });

  it('exports PRICING_SDK_MODULE as pricing', () => {
    assert.equal(PRICING_SDK_MODULE, 'pricing');
    assert.equal(MODULE_BARREL, 'pricing');
  });

  it('defaults all pricing feature flags to off', () => {
    assert.equal(PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_PRICING_ENABLED, false);
    assert.equal(PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_DYNAMIC_PRICING_ENABLED, false);
    assert.equal(PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_COUPONS_ENABLED, false);
    assert.equal(PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_OFFERS_ENABLED, false);
    assert.equal(PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_PRICING_PROJECTION_ENABLED, false);
    assert.equal(PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_PRICING_PROJECTION_PARITY_ENABLED, false);
    assert.equal(PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_PRICING_PROJECTION_SOAK_ENABLED, false);
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_PRICING_OPERATIONAL_VALIDATION_ENABLED,
      false
    );
  });

  it('maps feature flags to VITE env keys', () => {
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_ENV_KEYS.FF_PRICING_ENABLED,
      'VITE_FF_PRICING_ENABLED'
    );
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_ENV_KEYS.FF_DYNAMIC_PRICING_ENABLED,
      'VITE_FF_DYNAMIC_PRICING_ENABLED'
    );
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_ENV_KEYS.FF_COUPONS_ENABLED,
      'VITE_FF_COUPONS_ENABLED'
    );
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_ENV_KEYS.FF_OFFERS_ENABLED,
      'VITE_FF_OFFERS_ENABLED'
    );
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_ENV_KEYS.FF_PRICING_PROJECTION_ENABLED,
      'VITE_FF_PRICING_PROJECTION_ENABLED'
    );
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_ENV_KEYS.FF_PRICING_PROJECTION_PARITY_ENABLED,
      'VITE_FF_PRICING_PROJECTION_PARITY_ENABLED'
    );
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_ENV_KEYS.FF_PRICING_PROJECTION_SOAK_ENABLED,
      'VITE_FF_PRICING_PROJECTION_SOAK_ENABLED'
    );
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_ENV_KEYS.FF_PRICING_OPERATIONAL_VALIDATION_ENABLED,
      'VITE_FF_PRICING_OPERATIONAL_VALIDATION_ENABLED'
    );
  });

  it('resolvePricingEnabled is false with default flags', () => {
    assert.equal(resolvePricingEnabled(), false);
  });

  it('createPricingSDK returns stub adapter with NOT_CONFIGURED when flag off', async () => {
    const sdk = createPricingSDK();
    const result = await sdk.getPrice({ tenantId, itemId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('createPricingSDK returns UNAVAILABLE when flag on without repository', async () => {
    const sdk = createPricingSDK({ featureFlags: () => true });
    const result = await sdk.calculatePrice({ tenantId, itemId, quantity: 1 });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });

  it('StubPricingAdapter methods return NOT_CONFIGURED', async () => {
    const sdk = createStubPricingAdapter();
    const methods = [
      () => sdk.getPrice({ tenantId, itemId }),
      () => sdk.calculatePrice({ tenantId, itemId, quantity: 1 }),
      () => sdk.applyCoupon({ tenantId, couponCode: 'SAVE10' as never, subtotal: { amount: 100, currency: 'INR' } }),
      () => sdk.calculateTaxes({ tenantId, taxableAmount: { amount: 100, currency: 'INR' } }),
      () => sdk.calculateDeliveryFee({ tenantId, orderSubtotal: { amount: 100, currency: 'INR' } }),
      () => sdk.calculatePackagingFee({ tenantId, orderSubtotal: { amount: 100, currency: 'INR' }, itemCount: 1 }),
      () =>
        sdk.calculateFinalBill({
          tenantId,
          subtotal: { amount: 100, currency: 'INR' },
        }),
    ] as const;

    for (const invoke of methods) {
      const result = await invoke();
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.error.code, 'NOT_CONFIGURED');
    }

    const syncResult = sdk.validatePricing({
      tenantId,
      lines: [{ itemId, quantity: 1, unitPrice: { amount: 100, currency: 'INR' } }],
    });
    assert.equal(syncResult.ok, false);
    if (syncResult.ok) return;
    assert.equal(syncResult.error.code, 'NOT_CONFIGURED');
  });

  it('DefaultPricingAdapter returns NOT_CONFIGURED for calculator methods', async () => {
    const sdk = createDefaultPricingAdapter({
      repository: createStubPricingRepository(),
      repositoryEnabled: true,
    });
    const result = await sdk.calculateFinalBill({
      tenantId,
      subtotal: { amount: 200, currency: 'INR' },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('validateGetPriceQuery rejects invalid tenantId', () => {
    const result = validateGetPriceQuery({ tenantId: '' as TenantId, itemId });
    assert.equal(result.ok, false);
  });

  it('validatePricingInput rejects empty lines', () => {
    const result = validatePricingInput({ tenantId, lines: [] });
    assert.equal(result.ok, false);
  });

  it('pricing ports are structural contracts only', () => {
    const pricingRepo: PricingRepository = {
      getPrice: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'stub' } }),
      calculatePrice: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'stub' } }),
      getPriceList: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'stub' } }),
      getBranchPricing: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'stub' } }),
    };
    const taxRepo: TaxRepository = {
      getTaxRules: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'stub' } }),
    };
    assert.equal(typeof pricingRepo.getPrice, 'function');
    assert.equal(typeof taxRepo.getTaxRules, 'function');
  });
});

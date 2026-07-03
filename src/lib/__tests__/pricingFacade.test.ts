import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { sdkError, sdkFail, sdkOk } from '../../sdk/core/resultHelpers';
import type { PricingSDK } from '../../sdk/pricing/contracts/PricingSDK';
import { createStubPricingAdapter } from '../../sdk/pricing/adapters/StubPricingAdapter';
import { PricingFacade } from '../pricing/PricingFacade';
import { createPricingFacade } from '../pricing/PricingFacadeFactory';
import {
  normalizePricingError,
  pricingFeatureDisabledError,
  pricingOperationNotConfiguredError,
} from '../pricing/PricingErrorMapper';
import {
  getPricingSessionSnapshot,
  resetPricingSession,
  subscribePricingSession,
} from '../pricing/PricingSession';
import type { PricingFacadeTelemetryEvent } from '../pricing/PricingTelemetry';

const tenantId = 'tenant-pricing-facade-001';

const samplePriceResult = () => ({
  unitPrice: { amount: 90, currency: 'INR' },
  totalPrice: { amount: 90, currency: 'INR' },
  priceListVersion: '1.0.0',
});

const createMockSdk = (overrides: Partial<PricingSDK> = {}): PricingSDK => {
  const stub = createStubPricingAdapter();
  return { ...stub, ...overrides };
};

describe('PricingFacade (M8 PR-5)', () => {
  beforeEach(() => {
    resetPricingSession();
  });

  it('createPricingFacade returns a PricingFacade instance', () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk(),
    });
    assert.ok(facade instanceof PricingFacade);
  });

  it('returns feature-disabled outcome when FF_PRICING_ENABLED is off', async () => {
    const facade = createPricingFacade({
      isEnabled: () => false,
      sdk: createMockSdk({
        getPrice: async () => sdkOk(samplePriceResult()),
      }),
    });

    const outcome = await facade.getPrice({ tenantId, itemId: 'item-1' });
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.featureDisabled, true);
    assert.equal(getPricingSessionSnapshot().status, 'disabled');
  });

  it('pricingFeatureDisabledError is not retryable', () => {
    const error = pricingFeatureDisabledError();
    assert.equal(error.retryable, false);
    assert.equal(error.code, 'NOT_CONFIGURED');
  });

  it('getPrice invokes PricingSDK and stores success session', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getPrice: async () => sdkOk(samplePriceResult()),
      }),
    });

    const outcome = await facade.getPrice({ tenantId, itemId: 'item-1' });
    assert.equal(outcome.ok, true);
    assert.equal(getPricingSessionSnapshot().status, 'success');
    assert.equal(getPricingSessionSnapshot().lastRequest?.operation, 'getPrice');
    assert.deepEqual(getPricingSessionSnapshot().lastResult, samplePriceResult());
  });

  it('getPrice stores empty session when total price is zero', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getPrice: async () =>
          sdkOk({
            unitPrice: { amount: 0, currency: 'INR' },
            totalPrice: { amount: 0, currency: 'INR' },
          }),
      }),
    });

    const outcome = await facade.getPrice({ tenantId, itemId: 'item-1' });
    assert.equal(outcome.ok, true);
    assert.equal(getPricingSessionSnapshot().status, 'empty');
  });

  it('calculatePrice delegates to PricingSDK', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        calculatePrice: async () =>
          sdkOk({
            ...samplePriceResult(),
            basePrice: { amount: 80, currency: 'INR' },
          }),
      }),
    });

    const outcome = await facade.calculatePrice({ tenantId, itemId: 'item-1', quantity: 2 });
    assert.equal(outcome.ok, true);
    assert.equal(getPricingSessionSnapshot().status, 'success');
  });

  it('validatePricing is synchronous and returns validation result', () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        validatePricing: () => sdkOk({ valid: true, issues: [] }),
      }),
    });

    const outcome = facade.validatePricing({
      tenantId,
      lines: [{ itemId: 'item-1', quantity: 1, unitPrice: { amount: 100, currency: 'INR' } }],
    });
    assert.equal(outcome.ok, true);
    assert.equal(getPricingSessionSnapshot().status, 'success');
  });

  it('validatePricing rejects empty lines without calling SDK', () => {
    let called = false;
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        validatePricing: () => {
          called = true;
          return sdkOk({ valid: true, issues: [] });
        },
      }),
    });

    const outcome = facade.validatePricing({ tenantId, lines: [] });
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'VALIDATION');
    assert.equal(called, false);
  });

  it('validatePricing stores empty session when validation fails', () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        validatePricing: () =>
          sdkOk({
            valid: false,
            issues: [{ code: 'INVALID_MONEY', message: 'Invalid amount' }],
          }),
      }),
    });

    const outcome = facade.validatePricing({
      tenantId,
      lines: [{ itemId: 'item-1', quantity: 1, unitPrice: { amount: 100, currency: 'INR' } }],
    });
    assert.equal(outcome.ok, true);
    assert.equal(getPricingSessionSnapshot().status, 'empty');
  });

  it('getPriceList returns NOT_CONFIGURED until SDK exposes price list', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk(),
    });

    const outcome = await facade.getPriceList({ tenantId, priceListId: 'pl-1' });
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'NOT_CONFIGURED');
    assert.equal(getPricingSessionSnapshot().status, 'error');
  });

  it('applyCoupon delegates to PricingSDK.applyCoupon', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        applyCoupon: async () =>
          sdkOk({
            couponCode: 'SAVE10',
            discountAmount: { amount: 10, currency: 'INR' },
            applied: true,
          }),
      }),
    });

    const outcome = await facade.applyCoupon({
      tenantId,
      couponCode: 'SAVE10',
      subtotal: { amount: 100, currency: 'INR' },
    });
    assert.equal(outcome.ok, true);
    assert.equal(getPricingSessionSnapshot().status, 'success');
  });

  it('getDeliveryCharge delegates to PricingSDK.calculateDeliveryFee', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        calculateDeliveryFee: async () =>
          sdkOk({ fee: { amount: 30, currency: 'INR' }, feeType: 'delivery' }),
      }),
    });

    const outcome = await facade.getDeliveryCharge({
      tenantId,
      orderSubtotal: { amount: 200, currency: 'INR' },
    });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.value.feeType, 'delivery');
  });

  it('getPackagingCharge delegates to PricingSDK.calculatePackagingFee', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        calculatePackagingFee: async () =>
          sdkOk({ fee: { amount: 5, currency: 'INR' }, feeType: 'packaging' }),
      }),
    });

    const outcome = await facade.getPackagingCharge({
      tenantId,
      orderSubtotal: { amount: 200, currency: 'INR' },
      itemCount: 2,
    });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.value.feeType, 'packaging');
  });

  it('normalizes NOT_CONFIGURED SDK errors for presentation', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createStubPricingAdapter(),
    });

    const outcome = await facade.getPrice({ tenantId, itemId: 'item-1' });
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'NOT_CONFIGURED');
    assert.match(outcome.error.userMessage, /not available/i);
    assert.equal(getPricingSessionSnapshot().status, 'error');
  });

  it('normalizePricingError maps NOT_FOUND with user-friendly message', () => {
    const normalized = normalizePricingError({
      code: 'NOT_FOUND',
      message: 'price missing',
    });
    assert.equal(normalized.code, 'NOT_FOUND');
    assert.match(normalized.userMessage, /not found/i);
    assert.equal(normalized.retryable, false);
  });

  it('normalizePricingError marks UNAVAILABLE as retryable', () => {
    const normalized = normalizePricingError({
      code: 'UNAVAILABLE',
      message: 'timeout',
    });
    assert.equal(normalized.retryable, true);
    assert.match(normalized.userMessage, /temporarily unavailable/i);
  });

  it('normalizePricingError maps VALIDATION errors', () => {
    const normalized = normalizePricingError({
      code: 'VALIDATION',
      message: 'Invalid tenant',
    });
    assert.equal(normalized.code, 'VALIDATION');
    assert.equal(normalized.retryable, false);
  });

  it('normalizePricingError maps unknown SDK codes to UNKNOWN', () => {
    const normalized = normalizePricingError({
      code: 'INTERNAL' as 'UNKNOWN',
      message: 'boom',
    });
    assert.equal(normalized.code, 'UNKNOWN');
    assert.equal(normalized.retryable, true);
  });

  it('pricingOperationNotConfiguredError is not retryable', () => {
    const error = pricingOperationNotConfiguredError('getPriceList');
    assert.equal(error.code, 'NOT_CONFIGURED');
    assert.equal(error.retryable, false);
  });

  it('retry re-runs last query and increments retry count on failure', async () => {
    const retryableFail = async () =>
      sdkFail(sdkError('UNAVAILABLE', 'temporary', { retryable: true }));

    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({ getPrice: retryableFail }),
    });

    await facade.getPrice({ tenantId, itemId: 'item-1' });
    assert.equal(getPricingSessionSnapshot().retryCount, 1);

    const retry = await facade.retry();
    assert.equal(retry.ok, false);
    assert.equal(getPricingSessionSnapshot().retryCount, 2);
    assert.equal(getPricingSessionSnapshot().status, 'error');
  });

  it('retry returns validation error when no prior request exists', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk(),
    });

    const outcome = await facade.retry();
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'VALIDATION');
  });

  it('retry blocks after maximum attempts', async () => {
    const retryableFail = async () =>
      sdkFail(sdkError('UNAVAILABLE', 'temporary', { retryable: true }));

    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({ getPrice: retryableFail }),
    });

    await facade.getPrice({ tenantId, itemId: 'item-1' });
    await facade.retry();
    await facade.retry();

    const blocked = await facade.retry();
    assert.equal(blocked.ok, false);
    if (blocked.ok) return;
    assert.match(blocked.error.message, /maximum retry/i);
  });

  it('retry rejects non-retryable failures', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getPrice: async () => sdkFail(sdkError('NOT_FOUND', 'missing')),
      }),
    });

    await facade.getPrice({ tenantId, itemId: 'item-1' });
    const retry = await facade.retry();
    assert.equal(retry.ok, false);
    if (retry.ok) return;
    assert.match(retry.error.message, /not retryable/i);
  });

  it('subscribeSession notifies listeners on state changes', async () => {
    const statuses: string[] = [];
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getPrice: async () =>
          sdkOk({
            unitPrice: { amount: 0, currency: 'INR' },
            totalPrice: { amount: 0, currency: 'INR' },
          }),
      }),
    });

    const unsubscribe = facade.subscribeSession((snapshot) => {
      statuses.push(snapshot.status);
    });

    await facade.getPrice({ tenantId, itemId: 'item-1' });
    unsubscribe();

    assert.ok(statuses.includes('loading'));
    assert.ok(statuses.includes('empty'));
  });

  it('getSessionSnapshot returns current session state', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getPrice: async () => sdkOk(samplePriceResult()),
      }),
    });

    assert.equal(facade.getSessionSnapshot().status, 'idle');
    await facade.getPrice({ tenantId, itemId: 'item-1' });
    assert.equal(facade.getSessionSnapshot().status, 'success');
    assert.ok(facade.getSessionSnapshot().lastSuccessAt);
  });

  it('resetSession returns session to idle', async () => {
    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getPrice: async () => sdkOk(samplePriceResult()),
      }),
    });

    await facade.getPrice({ tenantId, itemId: 'item-1' });
    facade.resetSession();
    assert.equal(getPricingSessionSnapshot().status, 'idle');
    assert.equal(getPricingSessionSnapshot().lastRequest, null);
    assert.equal(getPricingSessionSnapshot().lastResult, null);
    assert.equal(getPricingSessionSnapshot().retryCount, 0);
  });

  it('emits facade telemetry events', async () => {
    const events: PricingFacadeTelemetryEvent[] = [];
    const facade = createPricingFacade({
      isEnabled: () => true,
      onTelemetry: (event) => events.push(event),
      sdk: createMockSdk({
        getPrice: async () => sdkOk(samplePriceResult()),
      }),
    });

    await facade.getPrice({ tenantId, itemId: 'item-1' });
    facade.resetSession();

    assert.ok(events.some((event) => event.type === 'pricing_facade_request'));
    assert.ok(events.some((event) => event.type === 'pricing_facade_success'));
    assert.ok(events.some((event) => event.type === 'pricing_facade_reset'));
  });

  it('emits failure and retry telemetry', async () => {
    const events: PricingFacadeTelemetryEvent[] = [];
    const retryableFail = async () =>
      sdkFail(sdkError('UNAVAILABLE', 'temporary', { retryable: true }));

    const facade = createPricingFacade({
      isEnabled: () => true,
      onTelemetry: (event) => events.push(event),
      sdk: createMockSdk({ getPrice: retryableFail }),
    });

    await facade.getPrice({ tenantId, itemId: 'item-1' });
    await facade.retry();

    assert.ok(events.some((event) => event.type === 'pricing_facade_failure'));
    assert.ok(events.some((event) => event.type === 'pricing_facade_retry'));
  });

  it('subscribePricingSession module export notifies listeners', async () => {
    const statuses: string[] = [];
    const unsubscribe = subscribePricingSession((snapshot) => statuses.push(snapshot.status));

    const facade = createPricingFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getPrice: async () => sdkOk(samplePriceResult()),
      }),
    });

    await facade.getPrice({ tenantId, itemId: 'item-1' });
    unsubscribe();
    assert.ok(statuses.includes('success'));
  });
});

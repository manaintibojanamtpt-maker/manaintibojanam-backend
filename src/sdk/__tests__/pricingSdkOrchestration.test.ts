import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPricingSDK, resolvePricingEnabled } from '../pricing/factory/createPricingSDK';
import { createOrchestratedPricingSDK } from '../pricing/orchestration/PricingSdkFactory';
import { createDefaultPricingAdapter } from '../pricing/orchestration/DefaultPricingAdapter';
import { createStubPricingRepository } from '../pricing/repository/StubPricingRepository';
import type { PricingRepository } from '../pricing/contracts/ports';
import type { PricingTelemetryEvent } from '../pricing/orchestration/PricingTelemetry';
import {
  mapDomainValidationToPricingValidationResult,
  mapMoneyDtoToDomain,
  mapValidatePricingInputToDomainLines,
} from '../pricing/orchestration/PricingDomainMapper';
import {
  mapDomainErrorToSdk,
  mapRepositoryResultToSdk,
  mapUnknownErrorToSdk,
  repositoryUnavailable,
} from '../pricing/orchestration/PricingErrorMapper';
import type { PricingPersistencePort } from '../pricing/repository/PricingRepositoryPorts';
import type { PriceRecord } from '../pricing/repository/PricingPersistenceModels';
import { sdkError } from '../core/resultHelpers';
import type { TenantId } from '../core/types';
import type { MenuItemId, PriceListId } from '../pricing/types/branded';
import type { PriceCalculation, PriceResult } from '../pricing/dto';

const tenantId = 'tenant-pricing-orch-001' as TenantId;
const itemId = 'item-001' as MenuItemId;

const samplePriceResult = (): PriceResult => ({
  unitPrice: { amount: 90, currency: 'INR' },
  totalPrice: { amount: 90, currency: 'INR' },
  priceListVersion: '1.0.0',
});

const createMockPricingRepository = (
  overrides: Partial<PricingRepository> = {}
): PricingRepository => ({
  getPrice: async () => ({ ok: true, value: samplePriceResult() }),
  calculatePrice: async () =>
    ({
      ok: true,
      value: {
        unitPrice: { amount: 90, currency: 'INR' },
        totalPrice: { amount: 180, currency: 'INR' },
        basePrice: { amount: 80, currency: 'INR' },
      } satisfies PriceCalculation,
    }),
  getPriceList: async () => ({ ok: false, error: sdkError('NOT_CONFIGURED', 'stub') }),
  getBranchPricing: async () => ({ ok: false, error: sdkError('NOT_CONFIGURED', 'stub') }),
  ...overrides,
});

const createMockPersistencePort = (): PricingPersistencePort => {
  const price: PriceRecord = {
    itemId: String(itemId),
    tenantId: String(tenantId),
    baseAmount: { amount: 100, currency: 'INR' },
    effectiveAmount: { amount: 90, currency: 'INR' },
    priceListVersion: '1.0.0',
    active: true,
  };
  return {
    loadPrice: async () => ({ ok: true, value: price }),
    loadPriceList: async () => ({
      ok: true,
      value: {
        priceListId: 'pl-1',
        tenantId: String(tenantId),
        name: 'Default',
        version: '1.0.0',
        prices: [{ itemId: String(itemId), baseAmount: price.baseAmount, sortOrder: 1, active: true }],
        active: true,
      },
    }),
    loadCoupon: async () => ({ ok: false, error: sdkError('NOT_FOUND', 'missing') }),
    loadCampaign: async () => ({ ok: false, error: sdkError('NOT_FOUND', 'missing') }),
    loadOffer: async () => ({ ok: false, error: sdkError('NOT_FOUND', 'missing') }),
    searchPricing: async (query) => ({
      ok: true,
      value: { hits: [], totalHits: 0, queryText: query.text },
    }),
    validateConnection: async () => ({ ok: true, value: { ok: true } }),
  };
};

describe('Pricing SDK orchestration (M8 PR-4)', () => {
  it('createPricingSDK returns stub when flag is off', async () => {
    const sdk = createPricingSDK();
    const result = await sdk.getPrice({ tenantId, itemId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('createPricingSDK uses injected pricingSdk first', async () => {
    const sdk = createPricingSDK({
      pricingSdk: createDefaultPricingAdapter({
        repository: createMockPricingRepository(),
        repositoryEnabled: true,
      }),
    });
    const result = await sdk.getPrice({ tenantId, itemId });
    assert.equal(result.ok, true);
  });

  it('orchestrated SDK returns UNAVAILABLE when flag on without repository injection', async () => {
    const sdk = createPricingSDK({ featureFlags: () => true });
    const result = await sdk.getPrice({ tenantId, itemId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });

  it('orchestrated SDK reads price via injected repository', async () => {
    const sdk = createOrchestratedPricingSDK({
      featureFlags: () => true,
      pricingRepository: createMockPricingRepository(),
    });
    const result = await sdk.getPrice({ tenantId, itemId });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.unitPrice.amount, 90);
  });

  it('orchestrated SDK reads price via persistence port injection', async () => {
    const sdk = createOrchestratedPricingSDK({
      featureFlags: () => true,
      persistencePort: createMockPersistencePort(),
    });
    const result = await sdk.getPrice({ tenantId, itemId });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.unitPrice.amount, 90);
  });

  it('orchestrated SDK returns NOT_FOUND from repository', async () => {
    const sdk = createOrchestratedPricingSDK({
      featureFlags: () => true,
      pricingRepository: createMockPricingRepository({
        getPrice: async () => ({ ok: false, error: sdkError('NOT_FOUND', 'Price not found') }),
      }),
    });
    const result = await sdk.getPrice({ tenantId, itemId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('calculatePrice returns UNAVAILABLE without repository injection', async () => {
    const sdk = createPricingSDK({ featureFlags: () => true });
    const result = await sdk.calculatePrice({ tenantId, itemId, quantity: 2 });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });

  it('calculatePrice delegates to repository when enabled', async () => {
    const sdk = createOrchestratedPricingSDK({
      featureFlags: () => true,
      pricingRepository: createMockPricingRepository(),
    });
    const result = await sdk.calculatePrice({ tenantId, itemId, quantity: 2 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.totalPrice.amount, 180);
  });

  it('applyCoupon returns NOT_CONFIGURED', async () => {
    const sdk = createOrchestratedPricingSDK({
      featureFlags: () => true,
      pricingRepository: createMockPricingRepository(),
    });
    const result = await sdk.applyCoupon({
      tenantId,
      couponCode: 'SAVE10' as never,
      subtotal: { amount: 100, currency: 'INR' },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('validatePricing runs domain validation on input lines', () => {
    const sdk = createOrchestratedPricingSDK({
      featureFlags: () => true,
      pricingRepository: createMockPricingRepository(),
    });
    const result = sdk.validatePricing({
      tenantId,
      lines: [{ itemId, quantity: 1, unitPrice: { amount: 100, currency: 'INR' } }],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.valid, true);
  });

  it('validatePricing returns VALIDATION for invalid money', () => {
    const sdk = createOrchestratedPricingSDK({
      featureFlags: () => true,
      pricingRepository: createMockPricingRepository(),
    });
    const result = sdk.validatePricing({
      tenantId,
      lines: [{ itemId, quantity: 1, unitPrice: { amount: -1, currency: 'INR' } }],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'VALIDATION');
  });

  it('domain validation failure maps to SDK VALIDATION on getPrice', async () => {
    const sdk = createOrchestratedPricingSDK({
      featureFlags: () => true,
      pricingRepository: createMockPricingRepository({
        getPrice: async () => ({
          ok: true,
          value: {
            unitPrice: { amount: -5, currency: 'INR' },
            totalPrice: { amount: -5, currency: 'INR' },
          },
        }),
      }),
    });
    const result = await sdk.getPrice({ tenantId, itemId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'VALIDATION');
  });

  it('emits orchestration telemetry events', async () => {
    const events: PricingTelemetryEvent[] = [];
    const sdk = createOrchestratedPricingSDK({
      featureFlags: () => true,
      pricingRepository: createMockPricingRepository(),
      onTelemetry: (event) => events.push(event),
    });
    await sdk.getPrice({ tenantId, itemId });
    assert.ok(events.some((event) => event.type === 'pricing_request'));
    assert.ok(events.some((event) => event.type === 'repository_read'));
    assert.ok(events.some((event) => event.type === 'pricing_success'));
  });

  it('mapRepositoryResultToSdk preserves NOT_FOUND', () => {
    const mapped = mapRepositoryResultToSdk({
      ok: false,
      error: sdkError('NOT_FOUND', 'missing'),
    });
    assert.equal(mapped.ok, false);
    if (mapped.ok) return;
    assert.equal(mapped.error.code, 'NOT_FOUND');
  });

  it('mapRepositoryResultToSdk maps unknown codes to UNAVAILABLE', () => {
    const mapped = mapRepositoryResultToSdk({
      ok: false,
      error: sdkError('INTERNAL', 'db down'),
    });
    assert.equal(mapped.ok, false);
    if (mapped.ok) return;
    assert.equal(mapped.error.code, 'UNAVAILABLE');
  });

  it('mapDomainErrorToSdk maps to VALIDATION', () => {
    const mapped = mapDomainErrorToSdk({
      code: 'INVALID_MONEY',
      message: 'Invalid money',
      field: 'amount',
    });
    assert.equal(mapped.ok, false);
    if (mapped.ok) return;
    assert.equal(mapped.error.code, 'VALIDATION');
  });

  it('repositoryUnavailable returns UNAVAILABLE', () => {
    const failure = repositoryUnavailable('getPrice');
    assert.equal(failure.ok, false);
    if (failure.ok) return;
    assert.equal(failure.error.code, 'UNAVAILABLE');
  });

  it('mapUnknownErrorToSdk maps to UNAVAILABLE', () => {
    const failure = mapUnknownErrorToSdk('unexpected');
    assert.equal(failure.ok, false);
    if (failure.ok) return;
    assert.equal(failure.error.code, 'UNAVAILABLE');
  });

  it('domain mapper converts money and validation results', () => {
    const money = mapMoneyDtoToDomain({ amount: 100, currency: 'INR' });
    assert.equal(money.amount, 100);

    const lines = mapValidatePricingInputToDomainLines({
      tenantId,
      lines: [{ itemId, quantity: 1, unitPrice: { amount: 50, currency: 'INR' } }],
    });
    assert.equal(lines[0]?.itemId, String(itemId));

    const validation = mapDomainValidationToPricingValidationResult({ valid: true, errors: [] });
    assert.equal(validation.valid, true);
  });

  it('resolvePricingEnabled remains false by default', () => {
    assert.equal(resolvePricingEnabled(), false);
  });

  it('stub repository through orchestrator returns UNAVAILABLE when not enabled', async () => {
    const sdk = createDefaultPricingAdapter({
      repository: createStubPricingRepository(),
      repositoryEnabled: false,
    });
    const result = await sdk.getPrice({ tenantId, itemId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPricingRepository } from '../pricing/repository/PricingRepositoryFactory';
import { createStubPricingRepository } from '../pricing/repository/StubPricingRepository';
import {
  createPricingRepositoryAdapter,
  searchPricingRecords,
  validatePricingPersistenceConnection,
} from '../pricing/repository/PricingRepositoryAdapter';
import type { PricingPersistencePort } from '../pricing/repository/PricingRepositoryPorts';
import type {
  CampaignRecord,
  CouponRecord,
  OfferRecord,
  PriceListRecord,
  PriceRecord,
  PricingSearchRecordResult,
} from '../pricing/repository/PricingPersistenceModels';
import {
  filterActiveBranchOverrideRecords,
  filterActivePriceListEntryRecords,
  mapBranchPricingFromPriceList,
  mapCampaignRecord,
  mapCouponRecord,
  mapDeliveryChargeRecord,
  mapGstRecord,
  mapOfferRecord,
  mapPackagingChargeRecord,
  mapPersistenceError,
  mapPriceListRecord,
  mapPriceRecordToPriceResult,
  mapPricingSearchRecordResult,
  mapTaxRecord,
  sortPriceListEntryRecords,
} from '../pricing/repository/PricingRepositoryMapper';
import { sdkError } from '../core/resultHelpers';
import type { TenantId } from '../core/types';
import type { BranchId, MenuItemId, PriceListId } from '../pricing/types/branded';

const tenantId = 'tenant-pricing-001' as TenantId;
const priceListId = 'pl-default' as PriceListId;
const branchId = 'branch-001' as BranchId;

const priceRecord = (): PriceRecord => ({
  itemId: 'item-1',
  tenantId: String(tenantId),
  baseAmount: { amount: 100, currency: 'INR' },
  effectiveAmount: { amount: 90, currency: 'INR' },
  priceListId: String(priceListId),
  priceListVersion: '1.0.0',
  branchId: String(branchId),
  active: true,
});

const priceListRecord = (): PriceListRecord => ({
  priceListId: String(priceListId),
  tenantId: String(tenantId),
  name: 'Default',
  version: '1.0.0',
  active: true,
  prices: [
    {
      itemId: 'item-2',
      baseAmount: { amount: 80, currency: 'INR' },
      sortOrder: 2,
      active: true,
    },
    {
      itemId: 'item-1',
      baseAmount: { amount: 100, currency: 'INR' },
      sortOrder: 1,
      active: true,
    },
    {
      itemId: 'item-inactive',
      baseAmount: { amount: 50, currency: 'INR' },
      sortOrder: 3,
      active: false,
    },
  ],
  branchOverrides: [
    {
      branchId: String(branchId),
      itemId: 'item-1',
      overrideAmount: { amount: 85, currency: 'INR' },
      active: true,
    },
    {
      branchId: String(branchId),
      itemId: 'item-hidden',
      overrideAmount: { amount: 40, currency: 'INR' },
      active: false,
    },
  ],
});

const couponRecord = (): CouponRecord => ({
  couponCode: 'SAVE10',
  tenantId: String(tenantId),
  discount: {
    discountId: 'd1',
    tenantId: String(tenantId),
    type: 'fixed',
    value: 10,
    applicationMode: 'manual',
    active: true,
  },
  enabled: true,
  active: true,
});

const campaignRecord = (): CampaignRecord => ({
  campaignId: 'camp-1',
  tenantId: String(tenantId),
  name: 'Summer Sale',
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2026-12-31T23:59:59.000Z',
  enabled: true,
  active: true,
});

const offerRecord = (): OfferRecord => ({
  offerId: 'offer-1',
  tenantId: String(tenantId),
  name: '10% Off',
  kind: 'percentage',
  value: 10,
  priority: 'normal',
  active: true,
});

const createMockPersistencePort = (
  overrides: Partial<PricingPersistencePort> = {}
): PricingPersistencePort => ({
  loadPrice: async (query) => {
    if (query.itemId === 'missing') {
      return { ok: false, error: sdkError('NOT_FOUND', 'Price not found') };
    }
    return { ok: true, value: priceRecord() };
  },
  loadPriceList: async () => ({ ok: true, value: priceListRecord() }),
  loadCoupon: async () => ({ ok: true, value: couponRecord() }),
  loadCampaign: async () => ({ ok: true, value: campaignRecord() }),
  loadOffer: async () => ({ ok: true, value: offerRecord() }),
  searchPricing: async (query): Promise<import('../core/result').SdkResult<PricingSearchRecordResult>> => ({
    ok: true,
    value: {
      hits: [
        {
          kind: 'price',
          recordId: 'item-1',
          score: 1,
          matchedFields: ['itemId'],
          price: priceRecord(),
        },
      ],
      totalHits: 1,
      queryText: query.text,
    },
  }),
  validateConnection: async () => ({ ok: true, value: { ok: true } }),
  ...overrides,
});

describe('Pricing repository foundation (M8 PR-3)', () => {
  it('createPricingRepository returns stub when flag is off', async () => {
    const repository = createPricingRepository();
    const result = await repository.getPrice({
      tenantId,
      itemId: 'item-1' as MenuItemId,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('createPricingRepository uses injected repository first', async () => {
    const injected = createStubPricingRepository();
    const repository = createPricingRepository({ repository: injected });
    const result = await repository.getPriceList(tenantId, priceListId);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.details?.provider, 'StubPricingRepository');
  });

  it('createPricingRepository uses adapter when flag on and persistence port provided', async () => {
    const repository = createPricingRepository({
      featureFlags: () => true,
      persistencePort: createMockPersistencePort(),
    });
    const result = await repository.getPrice({
      tenantId,
      itemId: 'item-1' as MenuItemId,
      quantity: 2,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.unitPrice.amount, 90);
    assert.equal(result.value.totalPrice.amount, 180);
  });

  it('adapter returns NOT_CONFIGURED for calculatePrice', async () => {
    const repository = createPricingRepositoryAdapter(createMockPersistencePort());
    const result = await repository.calculatePrice({
      tenantId,
      itemId: 'item-1' as MenuItemId,
      quantity: 1,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('adapter maps getPriceList from persistence port', async () => {
    const repository = createPricingRepositoryAdapter(createMockPersistencePort());
    const result = await repository.getPriceList(tenantId, priceListId);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.name, 'Default');
    assert.equal(result.value.prices.length, 2);
  });

  it('adapter orders price list entries by sortOrder', async () => {
    const repository = createPricingRepositoryAdapter(createMockPersistencePort());
    const result = await repository.getPriceList(tenantId, priceListId);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(
      result.value.prices.map((entry) => entry.itemId),
      ['item-1', 'item-2']
    );
  });

  it('adapter returns NOT_FOUND for missing price', async () => {
    const repository = createPricingRepositoryAdapter(createMockPersistencePort());
    const result = await repository.getPrice({
      tenantId,
      itemId: 'missing' as MenuItemId,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('adapter getBranchPricing returns NOT_CONFIGURED without price list context', async () => {
    const repository = createPricingRepositoryAdapter(createMockPersistencePort());
    const result = await repository.getBranchPricing(tenantId, branchId);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('mapPersistenceError preserves known infrastructure codes', () => {
    const mapped = mapPersistenceError(sdkError('NOT_FOUND', 'missing'));
    assert.equal(mapped.ok, false);
    if (mapped.ok) return;
    assert.equal(mapped.error.code, 'NOT_FOUND');
  });

  it('mapPersistenceError maps unknown codes to UNAVAILABLE', () => {
    const mapped = mapPersistenceError(sdkError('INTERNAL', 'db down'));
    assert.equal(mapped.ok, false);
    if (mapped.ok) return;
    assert.equal(mapped.error.code, 'UNAVAILABLE');
  });

  it('mapper converts persistence records to SDK DTO shapes', () => {
    const price = mapPriceRecordToPriceResult(priceRecord(), 3);
    assert.equal(price.unitPrice.amount, 90);
    assert.equal(price.totalPrice.amount, 270);

    const coupon = mapCouponRecord(couponRecord());
    assert.equal(coupon.couponCode, 'SAVE10');

    const campaign = mapCampaignRecord(campaignRecord());
    assert.equal(campaign.name, 'Summer Sale');

    const offer = mapOfferRecord(offerRecord());
    assert.equal(offer.kind, 'percentage');
  });

  it('mapper converts tax, gst, delivery, and packaging records', () => {
    const tax = mapTaxRecord({
      taxId: 'tax-1',
      tenantId: String(tenantId),
      code: 'SERVICE',
      label: 'Service Tax',
      ratePercent: 5,
      active: true,
    });
    assert.equal(tax.code, 'SERVICE');

    const gst = mapGstRecord({
      gstId: 'gst-1',
      tenantId: String(tenantId),
      categoryCode: 'restaurant',
      cgstPercent: 2.5,
      sgstPercent: 2.5,
      igstPercent: 5,
      active: true,
    });
    assert.equal(gst.cgstPercent, 2.5);

    const delivery = mapDeliveryChargeRecord({
      chargeId: 'del-1',
      tenantId: String(tenantId),
      zoneId: 'zone-1',
      flatAmount: { amount: 30, currency: 'INR' },
      active: true,
    });
    assert.equal(delivery.flatAmount.amount, 30);

    const packaging = mapPackagingChargeRecord({
      chargeId: 'pkg-1',
      tenantId: String(tenantId),
      label: 'Box',
      flatAmount: { amount: 5, currency: 'INR' },
      active: true,
    });
    assert.equal(packaging.label, 'Box');
  });

  it('sort and filter helpers are deterministic', () => {
    const sorted = sortPriceListEntryRecords(priceListRecord().prices);
    assert.equal(sorted[0]?.itemId, 'item-1');
    const activeOnly = filterActivePriceListEntryRecords(priceListRecord().prices);
    assert.equal(activeOnly.length, 2);
    const overrides = filterActiveBranchOverrideRecords(
      priceListRecord().branchOverrides ?? [],
      String(branchId)
    );
    assert.equal(overrides.length, 1);
  });

  it('mapBranchPricingFromPriceList filters branch overrides', () => {
    const branchPricing = mapBranchPricingFromPriceList(priceListRecord(), branchId);
    assert.equal(branchPricing.branchId, branchId);
    assert.equal(branchPricing.overrides.length, 1);
    assert.equal(branchPricing.overrides[0]?.overrideAmount.amount, 85);
  });

  it('mapPriceListRecord and mapPricingSearchRecordResult preserve fields', () => {
    const list = mapPriceListRecord(priceListRecord());
    assert.equal(list.version, '1.0.0');

    const search = mapPricingSearchRecordResult({
      hits: [
        {
          kind: 'price',
          recordId: 'item-1',
          score: 0.9,
          matchedFields: ['itemId'],
          price: priceRecord(),
        },
      ],
      totalHits: 1,
      queryText: 'item',
    });
    assert.equal(search.totalHits, 1);
    assert.equal(search.hits[0]?.price?.unitPrice.amount, 90);
  });

  it('validatePricingPersistenceConnection delegates to persistence port', async () => {
    const result = await validatePricingPersistenceConnection(createMockPersistencePort());
    assert.equal(result.ok, true);
  });

  it('searchPricingRecords delegates to persistence port', async () => {
    const result = await searchPricingRecords(createMockPersistencePort(), {
      tenantId: String(tenantId),
      text: 'item',
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.totalHits, 1);
  });

  it('stub repository returns NOT_CONFIGURED for all methods', async () => {
    const repository = createStubPricingRepository();
    const methods = [
      repository.getPrice({ tenantId, itemId: 'item-1' as MenuItemId }),
      repository.calculatePrice({ tenantId, itemId: 'item-1' as MenuItemId, quantity: 1 }),
      repository.getPriceList(tenantId, priceListId),
      repository.getBranchPricing(tenantId, branchId),
    ];
    const results = await Promise.all(methods);
    assert.ok(results.every((result) => !result.ok && result.error.code === 'NOT_CONFIGURED'));
  });
});

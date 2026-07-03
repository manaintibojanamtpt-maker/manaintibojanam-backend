import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRICING_DOMAIN_SCHEMA_VERSION,
  PRICING_DOMAIN_VERSION,
  PRICING_DECIMAL_PRECISION_DEFAULT,
} from '../shared/PricingDomainConstants';
import { PRICING_REASON_CODES } from '../shared/PricingReasonCodes';
import { pricingDomainOk, pricingDomainFail } from '../shared/PricingDomainResult';
import { MoneyBuilder, buildMoney, INR_CURRENCY } from '../money';
import { validateMoney, validateCurrency } from '../money/MoneyValidation';
import type { GSTRate, GSTBreakdown, GSTCategory } from '../gst/GST';
import { validateGSTRate, validateGSTCategory, validateGSTBreakdown } from '../gst/GSTValidation';
import {
  buildEffectivePrice,
  capturePriceSnapshot,
  type BasePrice,
  type BranchPriceOverride,
  type PriceList,
} from '../pricing/Pricing';
import {
  validateBasePrice,
  validateEffectivePrice,
  validatePriceList,
  validateBranchPriceOverride,
} from '../pricing/PricingValidation';
import type { Discount, DiscountPolicy } from '../discount/Discount';
import { validateDiscount, validateDiscountPolicy } from '../discount/DiscountValidation';
import type { Coupon } from '../coupon/Coupon';
import { validateCoupon } from '../coupon/CouponValidation';
import type { Campaign } from '../campaign/Campaign';
import { validateCampaign } from '../campaign/CampaignValidation';
import type { Offer } from '../offer/Offer';
import { validateOffer } from '../offer/OfferValidation';
import type { DeliveryRule, DeliveryZone } from '../delivery/Delivery';
import { validateDeliveryRule, validateDeliveryZone } from '../delivery/DeliveryValidation';
import type { PackagingRule } from '../packaging/Packaging';
import { validatePackagingRule } from '../packaging/PackagingValidation';
import { PricingDomainValidator } from '../validation/PricingDomainValidator';

const money = (amount = 100, currency = 'INR') => ({ amount, currency });
const fixedNow = '2026-06-01T12:00:00.000Z';

const baseDiscount = (): Discount => ({
  discountId: 'd1',
  type: 'fixed',
  value: 10,
  applicationMode: 'manual',
  active: true,
});

describe('Pricing domain foundation (M8 PR-2)', () => {
  describe('constants and reason codes', () => {
    it('exports domain version constants', () => {
      assert.equal(PRICING_DOMAIN_VERSION, '0.2.0-domain-foundation');
      assert.equal(PRICING_DOMAIN_SCHEMA_VERSION, '2');
      assert.equal(PRICING_DECIMAL_PRECISION_DEFAULT, 2);
    });

    it('defines pricing reason codes', () => {
      assert.equal(PRICING_REASON_CODES.INVALID_MONEY, 'INVALID_MONEY');
      assert.equal(PRICING_REASON_CODES.EMPTY_PRICE_LIST, 'EMPTY_PRICE_LIST');
      assert.equal(PRICING_REASON_CODES.COUPON_EXPIRED, 'COUPON_EXPIRED');
      assert.equal(PRICING_REASON_CODES.INVALID_GST_RATE, 'INVALID_GST_RATE');
    });

    it('pricingDomainResult helpers work', () => {
      assert.equal(pricingDomainOk(1).ok, true);
      assert.equal(pricingDomainFail(PRICING_REASON_CODES.INVALID_MONEY).ok, false);
    });
  });

  describe('money module', () => {
    it('MoneyBuilder produces immutable money', () => {
      const built = MoneyBuilder.zero('INR').withAmount(50).build();
      assert.equal(built.amount, 50);
      assert.equal(built.currency, 'INR');
    });

    it('buildMoney helper creates valid money', () => {
      const m = buildMoney(0);
      assert.equal(m.amount, 0);
      assert.equal(validateMoney(m).valid, true);
    });

    it('validateMoney rejects negative amounts', () => {
      const result = validateMoney({ amount: -1, currency: 'INR' });
      assert.equal(result.valid, false);
      assert.equal(result.errors[0]?.code, PRICING_REASON_CODES.INVALID_MONEY);
    });

    it('validateMoney allows zero amount', () => {
      assert.equal(validateMoney(money(0)).valid, true);
    });

    it('validateMoney rejects excessive decimal precision', () => {
      const result = validateMoney({ amount: 1.234, currency: 'INR' });
      assert.equal(result.valid, false);
      assert.equal(result.errors[0]?.code, PRICING_REASON_CODES.INVALID_DECIMAL_PRECISION);
    });

    it('validateCurrency validates INR_CURRENCY', () => {
      assert.equal(validateCurrency(INR_CURRENCY).valid, true);
    });
  });

  describe('gst module', () => {
    const validRate: GSTRate = {
      categoryCode: 'restaurant',
      cgstPercent: 2.5,
      sgstPercent: 2.5,
      igstPercent: 5,
      cessPercent: 0,
    };

    it('validateGSTRate accepts valid rate', () => {
      assert.equal(validateGSTRate(validRate).valid, true);
    });

    it('validateGSTRate rejects invalid percent', () => {
      const result = validateGSTRate({ ...validRate, cgstPercent: 101 });
      assert.equal(result.valid, false);
      assert.equal(result.errors[0]?.code, PRICING_REASON_CODES.INVALID_GST_RATE);
    });

    it('validateGSTCategory requires code and label', () => {
      const category: GSTCategory = { code: 'goods', label: 'Goods' };
      assert.equal(validateGSTCategory(category).valid, true);
    });

    it('validateGSTBreakdown validates structure', () => {
      const breakdown: GSTBreakdown = {
        rate: validRate,
        taxableAmount: 100,
        cgstAmount: 2.5,
        sgstAmount: 2.5,
        igstAmount: 0,
      };
      assert.equal(validateGSTBreakdown(breakdown).valid, true);
    });
  });

  describe('pricing module', () => {
    it('validateBasePrice accepts valid base price', () => {
      const price: BasePrice = { itemId: 'item-1', amount: money() };
      assert.equal(validateBasePrice(price).valid, true);
    });

    it('buildEffectivePrice applies branch override when active', () => {
      const base: BasePrice = { itemId: 'item-1', amount: money(100) };
      const override: BranchPriceOverride = {
        branchId: 'b1',
        itemId: 'item-1',
        overrideAmount: money(80),
        active: true,
      };
      const effective = buildEffectivePrice(base, override);
      assert.equal(effective.effectiveAmount.amount, 80);
    });

    it('capturePriceSnapshot is immutable snapshot', () => {
      const effective = buildEffectivePrice({ itemId: 'i1', amount: money() });
      const snapshot = capturePriceSnapshot(effective, 'snap-1', fixedNow);
      assert.equal(snapshot.snapshotId, 'snap-1');
      assert.equal(validateEffectivePrice(effective).valid, true);
    });

    it('validatePriceList rejects empty prices', () => {
      const priceList: PriceList = {
        priceListId: 'pl-1',
        tenantId: 't1',
        name: 'Default',
        prices: [],
        version: '1',
        active: true,
      };
      const result = validatePriceList(priceList);
      assert.equal(result.valid, false);
      assert.equal(result.errors[0]?.code, PRICING_REASON_CODES.EMPTY_PRICE_LIST);
    });

    it('validateBranchPriceOverride requires branch and item ids', () => {
      const result = validateBranchPriceOverride({
        branchId: '',
        itemId: 'i1',
        overrideAmount: money(),
        active: true,
      });
      assert.equal(result.valid, false);
    });
  });

  describe('discount module', () => {
    it('validateDiscount accepts percentage discount', () => {
      const discount: Discount = { ...baseDiscount(), type: 'percentage', value: 10 };
      assert.equal(validateDiscount(discount).valid, true);
    });

    it('validateDiscount rejects percentage over 100', () => {
      const discount: Discount = { ...baseDiscount(), type: 'percentage', value: 101 };
      assert.equal(validateDiscount(discount).valid, false);
    });

    it('validateDiscountPolicy accepts valid policy', () => {
      const policy: DiscountPolicy = {
        policyId: 'p1',
        allowStacking: false,
        manualAllowed: true,
        automaticAllowed: false,
        maxDiscountPercent: 50,
      };
      assert.equal(validateDiscountPolicy(policy).valid, true);
    });
  });

  describe('coupon module', () => {
    const validCoupon = (): Coupon => ({
      couponCode: 'SAVE10',
      discount: baseDiscount(),
      eligibility: { tenantId: 't1' },
      enabled: true,
      active: true,
      expiresAt: '2027-01-01T00:00:00.000Z',
      usageLimit: { maxUses: 100, usedCount: 0 },
    });

    it('validateCoupon accepts valid coupon', () => {
      assert.equal(validateCoupon(validCoupon(), fixedNow).valid, true);
    });

    it('validateCoupon rejects empty code', () => {
      const result = validateCoupon({ ...validCoupon(), couponCode: '' }, fixedNow);
      assert.equal(result.valid, false);
      assert.equal(result.errors[0]?.code, PRICING_REASON_CODES.INVALID_COUPON);
    });

    it('validateCoupon rejects expired coupon', () => {
      const result = validateCoupon(
        { ...validCoupon(), expiresAt: '2020-01-01T00:00:00.000Z' },
        fixedNow
      );
      assert.equal(result.valid, false);
      assert.equal(result.errors.some((e) => e.code === PRICING_REASON_CODES.COUPON_EXPIRED), true);
    });

    it('validateCoupon rejects usage exceeded', () => {
      const result = validateCoupon(
        { ...validCoupon(), usageLimit: { maxUses: 5, usedCount: 5 } },
        fixedNow
      );
      assert.equal(result.valid, false);
      assert.equal(
        result.errors.some((e) => e.code === PRICING_REASON_CODES.COUPON_USAGE_EXCEEDED),
        true
      );
    });
  });

  describe('campaign module', () => {
    const validCampaign = (): Campaign => ({
      campaignId: 'c1',
      name: 'Summer Sale',
      window: {
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-12-31T23:59:59.000Z',
      },
      eligibility: { tenantId: 't1' },
      enabled: true,
      active: true,
    });

    it('validateCampaign accepts active campaign in window', () => {
      assert.equal(validateCampaign(validCampaign(), fixedNow).valid, true);
    });

    it('validateCampaign rejects outside window', () => {
      const result = validateCampaign(
        {
          ...validCampaign(),
          window: {
            startsAt: '2027-01-01T00:00:00.000Z',
            endsAt: '2027-12-31T23:59:59.000Z',
          },
        },
        fixedNow
      );
      assert.equal(result.valid, false);
      assert.equal(
        result.errors.some((e) => e.code === PRICING_REASON_CODES.CAMPAIGN_OUTSIDE_WINDOW),
        true
      );
    });
  });

  describe('offer module', () => {
    it('validateOffer accepts percentage offer', () => {
      const offer: Offer = {
        offerId: 'o1',
        name: '10% Off',
        rule: { ruleId: 'r1', kind: 'percentage', value: 10 },
        priority: 'normal',
        active: true,
      };
      assert.equal(validateOffer(offer).valid, true);
    });

    it('validateOffer accepts buy_x_get_y placeholder', () => {
      const offer: Offer = {
        offerId: 'o2',
        name: 'Buy 2 Get 1',
        rule: { ruleId: 'r2', kind: 'buy_x_get_y', value: 0, buyQuantity: 2, getQuantity: 1 },
        priority: 'high',
        active: true,
      };
      assert.equal(validateOffer(offer).valid, true);
    });

    it('validateOffer rejects inactive offer', () => {
      const offer: Offer = {
        offerId: 'o3',
        name: 'Inactive',
        rule: { ruleId: 'r3', kind: 'fixed', value: 5 },
        priority: 'low',
        active: false,
      };
      const result = validateOffer(offer);
      assert.equal(result.valid, false);
      assert.equal(result.errors[0]?.code, PRICING_REASON_CODES.OFFER_INACTIVE);
    });
  });

  describe('delivery module', () => {
    it('validateDeliveryZone requires zone fields', () => {
      const zone: DeliveryZone = {
        zoneId: 'z1',
        name: 'Central',
        regionCode: 'IN-MH-PUN',
        active: true,
      };
      assert.equal(validateDeliveryZone(zone).valid, true);
    });

    it('validateDeliveryRule validates charges', () => {
      const rule: DeliveryRule = {
        ruleId: 'dr1',
        zoneId: 'z1',
        flatCharge: money(30),
        active: true,
      };
      assert.equal(validateDeliveryRule(rule).valid, true);
    });
  });

  describe('packaging module', () => {
    it('validatePackagingRule validates flat charge', () => {
      const rule: PackagingRule = {
        ruleId: 'pr1',
        label: 'Standard box',
        flatCharge: money(5),
        active: true,
      };
      assert.equal(validatePackagingRule(rule).valid, true);
    });
  });

  describe('PricingDomainValidator facade', () => {
    it('delegates to module validators', () => {
      const validator = new PricingDomainValidator();
      assert.equal(validator.validateMoney(money()).valid, true);
      assert.equal(
        validator.validateGSTRate({
          categoryCode: 'restaurant',
          cgstPercent: 2.5,
          sgstPercent: 2.5,
          igstPercent: 5,
        }).valid,
        true
      );
      assert.equal(validator.validateDiscount(baseDiscount()).valid, true);
    });
  });
});

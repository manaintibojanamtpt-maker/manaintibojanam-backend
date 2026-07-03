/**
 * Pricing domain validator facade (M8 PR-2).
 * Deterministic, pure — delegates to module validators.
 */

import type { Campaign } from '../campaign/Campaign';
import type { Coupon } from '../coupon/Coupon';
import type { DeliveryCharge, DeliveryRule, DeliveryZone } from '../delivery/Delivery';
import type { Discount, DiscountPolicy } from '../discount/Discount';
import type { GSTBreakdown, GSTCategory, GSTRate } from '../gst/GST';
import type { Currency, Money } from '../money/Money';
import type { Offer } from '../offer/Offer';
import type { PackagingCharge, PackagingRule } from '../packaging/Packaging';
import type {
  BasePrice,
  BranchPriceOverride,
  EffectivePrice,
  PriceList,
  PriceSnapshot,
} from '../pricing/Pricing';
import type { PricingDomainValidationResult } from '../shared/PricingDomainResult';
import { campaignValidator } from './CampaignValidator';
import { couponValidator } from './CouponValidator';
import { deliveryValidator } from './DeliveryValidator';
import { discountValidator } from './DiscountValidator';
import { gstValidator } from './GSTValidator';
import { moneyValidator } from './MoneyValidator';
import { offerValidator } from './OfferValidator';
import { packagingValidator } from './PackagingValidator';
import { priceValidator } from './PriceValidator';

export class PricingDomainValidator {
  validateMoney(money: Money): PricingDomainValidationResult {
    return moneyValidator.validate(money);
  }

  validateCurrency(currency: Currency): PricingDomainValidationResult {
    return moneyValidator.validateCurrency(currency);
  }

  validateGSTRate(rate: GSTRate): PricingDomainValidationResult {
    return gstValidator.validateRate(rate);
  }

  validateGSTCategory(category: GSTCategory): PricingDomainValidationResult {
    return gstValidator.validateCategory(category);
  }

  validateGSTBreakdown(breakdown: GSTBreakdown): PricingDomainValidationResult {
    return gstValidator.validateBreakdown(breakdown);
  }

  validateBasePrice(price: BasePrice): PricingDomainValidationResult {
    return priceValidator.validateBase(price);
  }

  validateEffectivePrice(price: EffectivePrice): PricingDomainValidationResult {
    return priceValidator.validateEffective(price);
  }

  validatePriceSnapshot(snapshot: PriceSnapshot): PricingDomainValidationResult {
    return priceValidator.validateSnapshot(snapshot);
  }

  validatePriceList(priceList: PriceList): PricingDomainValidationResult {
    return priceValidator.validatePriceList(priceList);
  }

  validateBranchPriceOverride(override: BranchPriceOverride): PricingDomainValidationResult {
    return priceValidator.validateBranchOverride(override);
  }

  validateDiscount(discount: Discount): PricingDomainValidationResult {
    return discountValidator.validate(discount);
  }

  validateDiscountPolicy(policy: DiscountPolicy): PricingDomainValidationResult {
    return discountValidator.validatePolicy(policy);
  }

  validateCoupon(coupon: Coupon, nowIso?: string): PricingDomainValidationResult {
    return couponValidator.validate(coupon, nowIso);
  }

  validateCampaign(campaign: Campaign, nowIso?: string): PricingDomainValidationResult {
    return campaignValidator.validate(campaign, nowIso);
  }

  validateOffer(offer: Offer): PricingDomainValidationResult {
    return offerValidator.validate(offer);
  }

  validateDeliveryZone(zone: DeliveryZone): PricingDomainValidationResult {
    return deliveryValidator.validateZone(zone);
  }

  validateDeliveryRule(rule: DeliveryRule): PricingDomainValidationResult {
    return deliveryValidator.validateRule(rule);
  }

  validateDeliveryCharge(charge: DeliveryCharge): PricingDomainValidationResult {
    return deliveryValidator.validateCharge(charge);
  }

  validatePackagingRule(rule: PackagingRule): PricingDomainValidationResult {
    return packagingValidator.validateRule(rule);
  }

  validatePackagingCharge(charge: PackagingCharge): PricingDomainValidationResult {
    return packagingValidator.validateCharge(charge);
  }
}

export const pricingDomainValidator = new PricingDomainValidator();
